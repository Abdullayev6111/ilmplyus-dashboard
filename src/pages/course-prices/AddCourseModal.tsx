import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CoursePricePayload, CoursePrice } from '../../types';
import { useOptions, getCourseLevels } from '../../hooks/useOptions';

interface FormState {
  filial: string;
  kurs: string;
  level: string;
  new_price: string;
  lessons_count: string;
  start_date: string;
  comment: string;
}

interface FormErrors {
  filial?: string;
  kurs?: string;
  level?: string;
  new_price?: string;
  lessons_count?: string;
  start_date?: string;
}

export interface AddCourseModalProps {
  coursePrices: CoursePrice[];
  editItem?: CoursePrice | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: CoursePricePayload) => void;
}

function getDaysInMonth(month: string): number {
  if (!month) return 31;
  const m = parseInt(month, 10);
  if ([1, 3, 5, 7, 8, 10, 12].includes(m)) return 31;
  if ([4, 6, 9, 11].includes(m)) return 30;
  return 29;
}

export default function AddCourseModal({
  coursePrices,
  editItem,
  isSaving,
  onClose,
  onSave,
}: AddCourseModalProps) {
  const { t } = useTranslation();

  const MONTHS = useMemo(
    () => [
      { value: '01', label: t('coursePrices.jan') },
      { value: '02', label: t('coursePrices.feb') },
      { value: '03', label: t('coursePrices.mar') },
      { value: '04', label: t('coursePrices.apr') },
      { value: '05', label: t('coursePrices.may') },
      { value: '06', label: t('coursePrices.jun') },
      { value: '07', label: t('coursePrices.jul') },
      { value: '08', label: t('coursePrices.aug') },
      { value: '09', label: t('coursePrices.sep') },
      { value: '10', label: t('coursePrices.oct') },
      { value: '11', label: t('coursePrices.nov') },
      { value: '12', label: t('coursePrices.dec') },
    ],
    [t],
  );

  const [form, setForm] = useState<FormState>(() => {
    if (editItem) {
      return {
        filial: String(editItem.branch_id),
        kurs: String(editItem.course_id),
        level: String(editItem.level_id),
        new_price: String(parseFloat(editItem.new_price) || ''),
        lessons_count: String(editItem.lessons_count),
        start_date: editItem.start_date ?? '',
        comment: editItem.comment ?? '',
      };
    }
    return {
      filial: '',
      kurs: '',
      level: '',
      new_price: '',
      lessons_count: '',
      start_date: '',
      comment: '',
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [startDay, setStartDay] = useState(() =>
    editItem?.start_date ? (editItem.start_date.split('.')[0] ?? '') : '',
  );
  const [startMonth, setStartMonth] = useState(() =>
    editItem?.start_date ? (editItem.start_date.split('.')[1] ?? '') : '',
  );
  const { data: branches = [], isLoading: isLoadingData } = useOptions('branches');
  const { data: filteredCourses = [] } = useOptions('courses');

  const selectedCourseLevels = useMemo(
    () => getCourseLevels(filteredCourses, form.kurs),
    [filteredCourses, form.kurs],
  );

  const dayOptions = useMemo(() => {
    const count = getDaysInMonth(startMonth);
    return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [startMonth]);

  const matchedCoursePrice = useMemo(() => {
    if (!form.kurs) return null;
    let list = coursePrices.filter((cp) => String(cp.course_id) === form.kurs);
    if (form.level) list = list.filter((cp) => String(cp.level_id) === form.level);
    if (!list.length) return null;
    return form.filial
      ? (list.find((cp) => String(cp.branch_id) === form.filial) ?? list[0])
      : list[0];
  }, [form.kurs, form.level, form.filial, coursePrices]);

  const oldPriceRaw = useMemo(() => {
    if (editItem) return parseFloat(editItem.old_price) || 0;
    return parseFloat(matchedCoursePrice?.new_price ?? '0') || 0;
  }, [matchedCoursePrice, editItem]);

  const newPriceRaw = useMemo(() => Number(form.new_price) || 0, [form.new_price]);
  const lessonCountRaw = useMemo(() => Number(form.lessons_count) || 0, [form.lessons_count]);

  const bittaDarsSummasiRaw = useMemo(
    () => (newPriceRaw && lessonCountRaw ? Math.round(newPriceRaw / lessonCountRaw) : 0),
    [newPriceRaw, lessonCountRaw],
  );

  const percentageRaw = useMemo(
    () =>
      oldPriceRaw && newPriceRaw
        ? Math.round(((newPriceRaw - oldPriceRaw) / oldPriceRaw) * 100)
        : 0,
    [oldPriceRaw, newPriceRaw],
  );

  const ozgaruvchiFoiz = useMemo(
    () => (oldPriceRaw && newPriceRaw ? `${percentageRaw > 0 ? '+' : ''}${percentageRaw}%` : ''),
    [oldPriceRaw, newPriceRaw, percentageRaw],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setForm((prev) =>
        name === 'filial'
          ? { ...prev, filial: value, kurs: '', level: '' }
          : name === 'kurs'
            ? { ...prev, kurs: value, level: '' }
            : { ...prev, [name]: value },
      );
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    },
    [],
  );

  const handleDayChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const day = e.target.value;
      setStartDay(day);
      setErrors((prev) => ({ ...prev, start_date: undefined }));
      setForm((prev) => ({ ...prev, start_date: day && startMonth ? `${day}.${startMonth}` : '' }));
    },
    [startMonth],
  );

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const month = e.target.value;
      setStartMonth(month);
      setErrors((prev) => ({ ...prev, start_date: undefined }));
      const maxDay = getDaysInMonth(month);
      const validDay = startDay && parseInt(startDay, 10) <= maxDay ? startDay : '';
      if (!validDay) setStartDay('');
      setForm((prev) => ({ ...prev, start_date: validDay && month ? `${validDay}.${month}` : '' }));
    },
    [startDay],
  );

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (!form.filial) next.filial = t('coursePrices.errBranch');
    if (!form.kurs) next.kurs = t('coursePrices.errCourse');
    if (!form.level) next.level = t('coursePrices.errLevel');
    if (!form.new_price || Number(form.new_price) <= 0)
      next.new_price = t('coursePrices.errNewPrice');
    if (!form.lessons_count || Number(form.lessons_count) <= 0)
      next.lessons_count = t('coursePrices.errLessonsCount');
    if (!form.start_date) next.start_date = t('coursePrices.errDate');
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, t]);

  const handleSave = useCallback(() => {
    if (!validate()) return;
    onSave({
      branch_id: Number(form.filial),
      course_id: Number(form.kurs),
      level_id: Number(form.level),
      old_price: oldPriceRaw,
      new_price: newPriceRaw,
      lessons_count: lessonCountRaw,
      lesson_price: bittaDarsSummasiRaw,
      percentage: percentageRaw,
      start_date: form.start_date,
      comment: form.comment || '',
    });
  }, [
    form,
    onSave,
    validate,
    oldPriceRaw,
    newPriceRaw,
    lessonCountRaw,
    bittaDarsSummasiRaw,
    percentageRaw,
  ]);

  const readonlyStyle = { background: '#f7f9fb', color: '#7a8fa6', cursor: 'default' } as const;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && !isSaving && onClose()}
    >
      <div className="modal add-payment-modal">
        <h3 className="modal-title">
          {editItem ? t('coursePrices.editTitle') : t('coursePrices.addTitle')}
        </h3>

        {isLoadingData ? (
          <p style={{ textAlign: 'center', color: '#7a8fa6' }}>{t('coursePrices.loading')}</p>
        ) : (
          <div className="add-payment-form">
            <div className="form-left">
              <div className="form-group">
                <label>{t('coursePrices.branch')}</label>
                <select
                  name="filial"
                  value={form.filial}
                  onChange={handleChange}
                  disabled={isSaving}
                >
                  <option value="">{t('coursePrices.choose')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.label}
                    </option>
                  ))}
                </select>
                {errors.filial && <small style={{ color: '#e70a0a' }}>{errors.filial}</small>}
              </div>

              <div className="form-group">
                <label>{t('coursePrices.course')}</label>
                <select
                  name="kurs"
                  value={form.kurs}
                  onChange={handleChange}
                  disabled={isSaving || !form.filial}
                >
                  <option value="">{t('coursePrices.choose')}</option>
                  {filteredCourses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {errors.kurs && <small style={{ color: '#e70a0a' }}>{errors.kurs}</small>}
              </div>

              <div className="form-group">
                <label>{t('coursePrices.level')}</label>
                <select
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  disabled={isSaving || !form.kurs}
                >
                  <option value="">{t('coursePrices.choose')}</option>
                  {selectedCourseLevels.map((l) => (
                    <option key={l.id} value={String(l.id)}>
                      {l.label}
                    </option>
                  ))}
                </select>
                {errors.level && <small style={{ color: '#e70a0a' }}>{errors.level}</small>}
              </div>

              <div className="form-group">
                <label>{t('coursePrices.oldPrice')}</label>
                <input
                  type="text"
                  value={oldPriceRaw ? oldPriceRaw.toLocaleString('uz-UZ') : ''}
                  readOnly
                  placeholder="0"
                  style={readonlyStyle}
                />
              </div>

              <div className="form-group">
                <label>{t('coursePrices.newPrice')}</label>
                <input
                  name="new_price"
                  type="number"
                  value={form.new_price}
                  onChange={handleChange}
                  placeholder="0"
                  min={0}
                  disabled={isSaving}
                  style={errors.new_price ? { borderColor: '#e70a0a' } : undefined}
                />
                {ozgaruvchiFoiz && (
                  <small style={{ color: newPriceRaw > oldPriceRaw ? '#27ae60' : '#e70a0a' }}>
                    {t('coursePrices.priceChange')}: {ozgaruvchiFoiz}
                  </small>
                )}
                {errors.new_price && <small style={{ color: '#e70a0a' }}>{errors.new_price}</small>}
              </div>
            </div>

            <div className="form-right">
              <div className="form-group">
                <label>{t('coursePrices.lessonsCount')}</label>
                <input
                  name="lessons_count"
                  type="number"
                  value={form.lessons_count}
                  onChange={handleChange}
                  placeholder="0"
                  min={1}
                  disabled={isSaving}
                  style={errors.lessons_count ? { borderColor: '#e70a0a' } : undefined}
                />
                {errors.lessons_count && (
                  <small style={{ color: '#e70a0a' }}>{errors.lessons_count}</small>
                )}
              </div>

              <div className="form-group">
                <label>{t('coursePrices.lessonPrice')}</label>
                <input
                  type="text"
                  value={bittaDarsSummasiRaw ? bittaDarsSummasiRaw.toLocaleString('uz-UZ') : ''}
                  readOnly
                  placeholder="0"
                  style={readonlyStyle}
                />
              </div>

              <div className="form-group">
                <label>{t('coursePrices.changePercent')}</label>
                <input
                  type="text"
                  value={ozgaruvchiFoiz}
                  readOnly
                  placeholder="0%"
                  style={readonlyStyle}
                />
              </div>

              <div className="form-group">
                <label>{t('coursePrices.changeDate')}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={startDay}
                    onChange={handleDayChange}
                    disabled={isSaving}
                    style={{ flex: 1, ...(errors.start_date ? { borderColor: '#e70a0a' } : {}) }}
                  >
                    <option value="">{t('coursePrices.day')}</option>
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <select
                    value={startMonth}
                    onChange={handleMonthChange}
                    disabled={isSaving}
                    style={{ flex: 1, ...(errors.start_date ? { borderColor: '#e70a0a' } : {}) }}
                  >
                    <option value="">{t('coursePrices.month')}</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.start_date && (
                  <small style={{ color: '#e70a0a' }}>{errors.start_date}</small>
                )}
              </div>

              <div className="form-group">
                <label>{t('coursePrices.comment')}</label>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={handleChange}
                  rows={3}
                  placeholder={t('coursePrices.commentPlaceholder')}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="primary"
            onClick={handleSave}
            disabled={isSaving || isLoadingData}
          >
            {isSaving ? t('coursePrices.saving') : t('coursePrices.save')}
          </button>
          <button type="button" className="cancel" onClick={onClose} disabled={isSaving}>
            {t('coursePrices.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
