import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { API } from '@/api/api';
import { useOptions } from '@/api/options';
import DateInput from '@/components/DateInput';
import { getApiErrorMessage } from '@/utils/apiError';
import { usePermission } from '@/hooks/usePermission';
import './payrollAdjustments.css';

/* ------------------------------------------------------------------ *
 * Ish haqqi tuzatish formasi — alohida page.
 *   /payroll-adjustments/create      -> yangi
 *   /payroll-adjustments/:id/edit    -> tuzatish
 *   /payroll-adjustments/:id         -> ko'rish (read-only)
 *
 * Tur (type) tanlovi maydonlarni boshqaradi:
 *   extra_worked -> Sana + soat (oylikka qo'shiladi)
 *   not_worked   -> Sana + soat (oylikdan ayriladi)
 *   substituted  -> Sana + kimning o'rniga + soat (100% qo'shiladi)
 *
 * Maydon nomlari jonli API bilan tasdiqlangan (2026-07-17):
 *   izoh -> `note` ("comment" jim e'tiborsiz qoldiriladi)
 *   kimning o'rniga: so'rovda `substituted_for_employee_id`,
 *   javobda `substituted_for` = { id, full_name }
 * ------------------------------------------------------------------ */

type AdjType = 'extra_worked' | 'not_worked' | 'substituted';

/** UI tartibi + i18n/CSS kaliti (backend enumidan farq qiladi). */
const TYPES: { key: AdjType; slug: string; icon: string }[] = [
  { key: 'extra_worked', slug: 'extra', icon: '+' },
  { key: 'not_worked', slug: 'absent', icon: '−' },
  { key: 'substituted', slug: 'substitute', icon: '↔' },
];

const TYPE_KEYS = TYPES.map((tp) => tp.key) as string[];

interface AdjustmentResponse {
  id?: number;
  employee_id?: number;
  type?: string;
  date?: string | null;
  hours?: number | string | null;
  note?: string | null;
  substituted_for?: { id?: number; full_name?: string } | null;
  employee?: {
    id?: number;
    full_name?: string;
    department?: string | null;
    position?: string | null;
    branch?: string | null;
  };
}

/** Ro'yxatdan uzatilgan xodim ma'lumoti — header darhol chizilishi uchun. */
interface NavState {
  employeeId?: number;
  fullName?: string;
  department?: string;
  position?: string;
  branch?: string;
}

interface FormState {
  type: AdjType;
  date: string;
  hours: number | '';
  comment: string;
  substitute_employee_id: number | '';
  /** Yangi tuzatishda xodim shu yerda tanlanadi (tahrir/ko'rishda yozuvdan keladi). */
  employee_id: number | '';
}

const EMPTY_FORM: FormState = {
  type: 'extra_worked',
  date: '',
  hours: '',
  comment: '',
  substitute_employee_id: '',
  employee_id: '',
};

const AdjustmentForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const navState = (location.state as NavState) || {};

  // /payroll-adjustments/:id  -> ko'rish;  /:id/edit -> tuzatish;  /create -> yangi
  const isView = !!id && !location.pathname.endsWith('/edit');
  const isEdit = !!id && location.pathname.endsWith('/edit');
  const requiredPermission = isEdit
    ? 'payroll_adjustments.edit'
    : isView
      ? 'payroll_adjustments.view'
      : 'payroll_adjustments.create';
  const canAccess = usePermission(requiredPermission);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  // Qaysi yozuv formaga seed qilinganini kuzatadi (effekt emas, render fazasi).
  const [seededId, setSeededId] = useState<string | undefined>(undefined);

  const { data: employeeOptions = [] } = useOptions('employees');

  const {
    data: adjustment,
    isLoading,
    isError,
  } = useQuery<AdjustmentResponse>({
    queryKey: ['payroll-adjustment', id],
    queryFn: async () => {
      const { data } = await API.get(`/payroll/adjustments/${id}`);
      return data?.data ?? data;
    },
    enabled: !!id && canAccess,
    // Har ochilganda eng oxirgi saqlangan qiymatlar bilan to'lsin.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  // Mavjud yozuvni formaga bir marta seed qilish — effekt emas, render fazasida
  // (cascading render bo'lmasligi uchun): https://react.dev/learn/you-might-not-need-an-effect
  if (adjustment && seededId !== id) {
    setSeededId(id);
    const rawType = (adjustment.type || 'extra_worked') as AdjType;
    setForm({
      type: TYPE_KEYS.includes(rawType) ? rawType : 'extra_worked',
      date: (adjustment.date || '').slice(0, 10),
      hours:
        adjustment.hours === null || adjustment.hours === undefined ? '' : Number(adjustment.hours),
      comment: adjustment.note || '',
      substitute_employee_id: adjustment.substituted_for?.id ?? '',
      employee_id: adjustment.employee_id ?? adjustment.employee?.id ?? '',
    });
  }

  // ---- Header qiymatlari ----
  const emp = adjustment?.employee;
  // Yangi tuzatishda xodim yozuvdan ham, navState'dan ham kelmaydi — formada tanlanadi.
  const employeeId = adjustment?.employee_id ?? emp?.id ?? navState.employeeId ?? form.employee_id;
  /** Xodim tanlash select'i faqat yangi tuzatishda va kontekst bo'lmaganda kerak. */
  const needsEmployeePicker = !id && navState.employeeId === undefined;

  const pickedEmployee = employeeOptions.find((o) => o.id === form.employee_id);
  const fullName = emp?.full_name || navState.fullName || pickedEmployee?.label || '-';
  const departmentName = emp?.department || navState.department || '-';
  const positionName = emp?.position || navState.position || '-';
  const branchName = emp?.branch || navState.branch || '-';

  const isSubstitute = form.type === 'substituted';

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Maydon nomlari jonli API bilan tasdiqlangan: izoh `note`, o'rniga
      // ishlangan xodim `substituted_for_employee_id`.
      const payload: Record<string, unknown> = {
        employee_id: employeeId,
        type: form.type,
        date: form.date,
        hours: form.hours === '' ? null : Number(form.hours),
        note: form.comment || null,
      };
      // "Boshqasining o'rniga ishladi" da kimning o'rniga ishlagani yuboriladi.
      if (isSubstitute) {
        payload.substituted_for_employee_id =
          form.substitute_employee_id === '' ? null : Number(form.substitute_employee_id);
      }

      const { data } = isEdit
        ? await API.put(`/payroll/adjustments/${id}`, payload)
        : await API.post('/payroll/adjustments', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments'] });
      notifications.show({
        title: t('payrollAdjustments.savedTitle'),
        message: t('payrollAdjustments.savedMessage'),
        color: 'green',
      });
      navigate('/payroll-adjustments');
    },
    // A.1: ilgari onError yo'q edi — backend rad etsa forma jim turardi.
    onError: (error) => {
      notifications.show({
        title: t('payrollAdjustments.errorTitle'),
        message: getApiErrorMessage(error, t('payrollAdjustments.saveErrorMessage')),
        color: 'red',
      });
    },
  });

  const isValid =
    !!form.date &&
    form.hours !== '' &&
    (!isSubstitute || form.substitute_employee_id !== '') &&
    (!needsEmployeePicker || form.employee_id !== '');

  const handleSave = () => {
    setShowErrors(true);
    if (!isValid) return;
    saveMutation.mutate();
  };

  const invalid = (empty: boolean) => (showErrors && empty ? 'pa-invalid' : '');

  const types = TYPES.map((tp) => ({
    key: tp.key,
    slug: tp.slug,
    icon: tp.icon,
    title: t(`payrollAdjustments.types.${tp.slug}.title`),
    desc: t(`payrollAdjustments.types.${tp.slug}.desc`),
    bold: t(`payrollAdjustments.types.${tp.slug}.bold`),
  }));

  if (!canAccess) return null;

  if (id && isLoading) {
    return (
      <div className="pa-container container">
        <div className="pa-loading">{t('payrollAdjustments.loading')}</div>
      </div>
    );
  }
  if (id && isError) {
    return (
      <div className="pa-container container">
        <div className="pa-error">{t('payrollAdjustments.error')}</div>
      </div>
    );
  }

  return (
    <div className="pa-container container">
      <div className="pa-form-card">
        {/* Ma'lumot bandi */}
        <div className="pa-info">
          <div className="pa-info-item">
            <span className="pa-info-label">{t('payrollAdjustments.info.fullName')}</span>
            <span className="pa-info-value">{fullName}</span>
          </div>
          <div className="pa-info-item">
            <span className="pa-info-label">{t('payrollAdjustments.info.departmentPosition')}</span>
            <span className="pa-info-value">
              {departmentName} / {positionName}
            </span>
          </div>
          <div className="pa-info-item">
            <span className="pa-info-label">{t('payrollAdjustments.info.branch')}</span>
            <span className="pa-info-value">{branchName}</span>
          </div>
        </div>

        {/* Yangi tuzatish jadvaldan emas, to'g'ridan-to'g'ri ochilganda xodim
            shu yerda tanlanadi — aks holda employee_id bo'sh ketib 422 bo'lardi. */}
        {needsEmployeePicker && (
          <div className="pa-row">
            <div className="pa-field">
              <label>
                {t('payrollAdjustments.fields.employee')}
                <span className="req">*</span>
              </label>
              <select
                className={invalid(form.employee_id === '')}
                value={form.employee_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    employee_id: e.target.value === '' ? '' : Number(e.target.value),
                    substitute_employee_id: '',
                  })
                }
              >
                <option value="">{t('payrollAdjustments.select')}</option>
                {employeeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pa-field" />
          </div>
        )}

        {/* 3 ta tur kartasi */}
        <div className="pa-types">
          {types.map((tp) => (
            <button
              key={tp.key}
              type="button"
              disabled={isView}
              className={`pa-type pa-type--${tp.slug} ${form.type === tp.key ? 'active' : ''}`}
              onClick={() => setForm({ ...form, type: tp.key, substitute_employee_id: '' })}
            >
              <span className="pa-type-icon">{tp.icon}</span>
              <span className="pa-type-title">{tp.title}</span>
              <span className="pa-type-desc">
                {tp.desc} <b>{tp.bold}</b>
              </span>
            </button>
          ))}
        </div>

        {/* Sana | (o'rniga ishlagan xodim) */}
        <div className="pa-row">
          <div className="pa-field">
            <label>
              {t('payrollAdjustments.fields.date')}
              <span className="req">*</span>
            </label>
            <DateInput
              value={form.date}
              disabled={isView}
              className={invalid(!form.date)}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <span className="pa-hint">{t('payrollAdjustments.fields.periodHint')}</span>
          </div>

          {isSubstitute ? (
            <div className="pa-field">
              <label>
                {t('payrollAdjustments.fields.substitute')}
                <span className="req">*</span>
              </label>
              <select
                disabled={isView}
                className={invalid(form.substitute_employee_id === '')}
                value={form.substitute_employee_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    substitute_employee_id: e.target.value === '' ? '' : Number(e.target.value),
                  })
                }
              >
                <option value="">{t('payrollAdjustments.select')}</option>
                {employeeOptions
                  .filter((o) => o.id !== employeeId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="pa-field">
              <label>
                {form.type === 'not_worked'
                  ? t('payrollAdjustments.fields.hoursNotWorked')
                  : t('payrollAdjustments.fields.hoursWorked')}
                <span className="req">*</span>
              </label>
              <input
                type="number"
                min={0}
                disabled={isView}
                className={invalid(form.hours === '')}
                value={form.hours}
                onChange={(e) =>
                  setForm({ ...form, hours: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
            </div>
          )}
        </div>

        {/* substitute rejimida soat alohida qatorda */}
        {isSubstitute && (
          <div className="pa-row">
            <div className="pa-field">
              <label>
                {t('payrollAdjustments.fields.hoursWorked')}
                <span className="req">*</span>
              </label>
              <input
                type="number"
                min={0}
                disabled={isView}
                className={invalid(form.hours === '')}
                value={form.hours}
                onChange={(e) =>
                  setForm({ ...form, hours: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
            </div>
          </div>
        )}

        {/* Izoh */}
        <div className="pa-row pa-row--1">
          <div className="pa-field">
            <label>{t('payrollAdjustments.fields.comment')}</label>
            <textarea
              disabled={isView}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
            />
          </div>
        </div>

        {/* Tugmalar: center'da — chapda Bekor qilish, o'ngda Saqlash */}
        <div className="pa-form-actions">
          {/* B.5: "Bekor qilish" jadvalda tuzatishni RAD ETISH ma'nosida ishlatiladi —
              formada esa shunchaki orqaga qaytish. Bir xil qizil tugma, ikki xil
              oqibat chalkash edi. */}
          <button className="pa-btn pa-btn--danger" onClick={() => navigate('/payroll-adjustments')}>
            {t('payrollAdjustments.back')}
          </button>
          {!isView && (
            <button
              className="pa-btn pa-btn--primary"
              disabled={saveMutation.isPending}
              onClick={handleSave}
            >
              {t('payrollAdjustments.actions.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdjustmentForm;
