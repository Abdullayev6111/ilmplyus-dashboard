import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import '../users/users.css';
import type { Employee, EmployeePayload } from '../../types/employee.types';
import type { Branch } from '../../types/common.types';
import { useCreateMutation, useDeleteMutation } from '../../hooks/useMutations';
import { useMutation } from '@tanstack/react-query';

const QUERY_KEY = ['employees'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

const EMPTY_FORM: EmployeePayload = {
  first_name: '',
  last_name: '',
  middle_name: '',
  branch_id: 0,
  pinfl: '',
  passport_series: '',
  passport_number: '',
  passport_given_date: '',
  passport_given_by: '',
  birth_date: '',
  phone: '',
  address_registration: '',
  address_living: '',
};

// ─── Delete confirm modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  employeeName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DeleteModal({ employeeName, onConfirm, onCancel, loading }: DeleteModalProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay">
      <div className="modal small" style={{ width: 360 }}>
        <h2 className="modal-title" style={{ marginTop: 0 }}>
          {t('employees.deleteModalTitle')}
        </h2>
        <p style={{ textAlign: 'center', color: '#444', marginBottom: 0 }}>
          <strong>{employeeName}</strong> {t('employees.deleteModalText')}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="danger"
            style={{ background: '#c90000', color: '#fff' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t('employees.deleting') : t('employees.delete')}
          </button>
          <button type="button" className="cancel" onClick={onCancel} disabled={loading}>
            {t('employees.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

interface EmployeeModalProps {
  initial: EmployeePayload & { id?: number; photo_url?: string };
  branches: Branch[];
  onClose: () => void;
  onSave: (payload: EmployeePayload, id?: number, photoFile?: File | null) => void;
  loading: boolean;
}

function EmployeeModal({ initial, branches, onClose, onSave, loading }: EmployeeModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(initial.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<EmployeePayload>({
    first_name: initial.first_name,
    last_name: initial.last_name,
    middle_name: initial.middle_name,
    branch_id: initial.branch_id,
    pinfl: initial.pinfl,
    passport_series: initial.passport_series,
    passport_number: initial.passport_number,
    passport_given_date: initial.passport_given_date,
    passport_given_by: initial.passport_given_by,
    birth_date: initial.birth_date,
    phone: initial.phone,
    address_registration: initial.address_registration,
    address_living: initial.address_living,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(initial.photo_url ?? '');

  const set =
    (field: keyof EmployeePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]: field === 'branch_id' ? Number(e.target.value) : e.target.value,
      }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form, initial.id, photoFile);
  };

  const fieldStyle: React.CSSProperties = {
    height: 46,
    padding: '0 14px',
    border: '1.5px solid #d0d9e6',
    borderRadius: 12,
    fontSize: 14,
    color: '#003366',
    background: '#fff',
    outline: 'none',
  };

  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  };

  const labelStyle: React.CSSProperties = { fontSize: 13, color: '#003366', fontWeight: 500 };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 660, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 className="modal-title" style={{ marginTop: 0 }}>
          {isEdit ? t('employees.editModalTitle') : t('employees.addModalTitle')}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Photo upload */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 24,
              padding: '16px 20px',
              background: '#f4f7fb',
              borderRadius: 14,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #d0d9e6',
                flexShrink: 0,
                background: '#e8eef5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Rasm"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <i className="fa-solid fa-user" style={{ fontSize: 32, color: '#a0b0c8' }} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#003366', fontWeight: 500 }}>
                {t('employees.photoLabel')}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 18px',
                  background: '#003366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <i className="fa-solid fa-upload" style={{ fontSize: 12 }} />
                {photoFile
                  ? t('employees.photoChange')
                  : isEdit
                    ? t('employees.photoUpdate')
                    : t('employees.photoAdd')}
              </button>
              {photoFile && (
                <span style={{ fontSize: 12, color: '#7a8fa6' }}>{photoFile.name}</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Fields grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px 24px',
              marginBottom: 20,
            }}
          >
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldLastName')}</label>
              <input
                style={fieldStyle}
                required
                value={form.last_name}
                onChange={set('last_name')}
                placeholder={t('employees.fieldLastName')}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldFirstName')}</label>
              <input
                style={fieldStyle}
                required
                value={form.first_name}
                onChange={set('first_name')}
                placeholder={t('employees.fieldFirstName')}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldMiddleName')}</label>
              <input
                style={fieldStyle}
                value={form.middle_name}
                onChange={set('middle_name')}
                placeholder={t('employees.fieldMiddleName')}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldBranch')}</label>
              <select
                required
                value={form.branch_id || ''}
                onChange={set('branch_id')}
                style={fieldStyle}
              >
                <option value="">{t('employees.selectBranch')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name_uz}
                  </option>
                ))}
              </select>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldPhone')}</label>
              <input
                style={fieldStyle}
                required
                value={form.phone}
                onChange={set('phone')}
                placeholder="+998901234567"
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldPinfl')}</label>
              <input
                style={fieldStyle}
                value={form.pinfl}
                onChange={set('pinfl')}
                placeholder="14 raqam"
                maxLength={14}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldPassportSeries')}</label>
              <input
                style={fieldStyle}
                value={form.passport_series}
                onChange={set('passport_series')}
                placeholder="AB"
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldPassportNumber')}</label>
              <input
                style={fieldStyle}
                value={form.passport_number}
                onChange={set('passport_number')}
                placeholder="1234567"
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldPassportDate')}</label>
              <input
                style={fieldStyle}
                type="date"
                value={form.passport_given_date?.split('T')[0] ?? ''}
                onChange={set('passport_given_date')}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldPassportGiven')}</label>
              <input
                style={fieldStyle}
                value={form.passport_given_by}
                onChange={set('passport_given_by')}
                placeholder="IIB"
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldBirthDate')}</label>
              <input
                style={fieldStyle}
                type="date"
                value={form.birth_date?.split('T')[0] ?? ''}
                onChange={set('birth_date')}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>{t('employees.fieldAddressReg')}</label>
              <input
                style={fieldStyle}
                value={form.address_registration}
                onChange={set('address_registration')}
                placeholder={t('employees.fieldAddressReg')}
              />
            </div>
            <div style={{ ...groupStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>{t('employees.fieldAddressLiving')}</label>
              <input
                style={fieldStyle}
                value={form.address_living}
                onChange={set('address_living')}
                placeholder={t('employees.fieldAddressLiving')}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? t('employees.saving') : t('employees.save')}
            </button>
            <button type="button" className="cancel" onClick={onClose} disabled={loading}>
              {t('employees.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ID tooltip / ask-desk ───────────────────────────────────────────────────

function IdTooltip({
  employee,
  anchorRect,
  onClose,
}: {
  employee: Employee;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  const top = anchorRect.bottom + window.scrollY + 6;
  const left = anchorRect.left + window.scrollX;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'absolute',
        top,
        left,
        zIndex: 9000,
        background: '#fff',
        border: '1.5px solid #d0d9e6',
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,51,102,0.13)',
        padding: '14px 18px',
        minWidth: 230,
        maxWidth: 280,
      }}
    >
      {/* arrow */}
      <div
        style={{
          position: 'absolute',
          top: -7,
          left: 16,
          width: 12,
          height: 12,
          background: '#fff',
          border: '1.5px solid #d0d9e6',
          borderBottom: 'none',
          borderRight: 'none',
          transform: 'rotate(45deg)',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <img
          src={employee.photo_url}
          alt={employee.full_name}
          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#003366', lineHeight: 1.3 }}>
            {employee.full_name}
          </div>
          <div style={{ fontSize: 11, color: '#7a8fa6', marginTop: 2 }}>
            ID: <strong style={{ color: '#003366' }}>{employee.id}</strong>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { icon: 'fa-building', text: employee.branch?.name_uz ?? '—' },
          { icon: 'fa-phone', text: employee.phone },
          { icon: 'fa-calendar', text: formatDate(employee.birth_date) },
        ].map(({ icon, text }) => (
          <div
            key={icon}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#444' }}
          >
            <i
              className={`fa-solid ${icon}`}
              style={{ width: 14, color: '#7a8fa6', fontSize: 11 }}
            />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Employee detail card ─────────────────────────────────────────────────────

function EmployeeDetailCard({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const { t } = useTranslation();
  const row = (label: string, value: string | number | null | undefined) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '9px 0',
        borderBottom: '1px solid #f0f3f8',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: '#7a8fa6', flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#003366', fontWeight: 500, textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 440, maxHeight: '90vh', overflowY: 'auto', padding: '24px 28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <img
            src={employee.photo_url}
            alt={employee.full_name}
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #d0d9e6',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#003366' }}>
              {employee.full_name}
            </div>
            <div style={{ fontSize: 12, color: '#7a8fa6', marginTop: 3 }}>ID: {employee.id}</div>
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
              {employee.branch?.name_uz ?? '—'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: '#a0b0c8',
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Details */}
        <div>
          {row(t('employees.detailPhone'), employee.phone)}
          {row(t('employees.fieldPinfl'), employee.pinfl)}
          {row(
            t('employees.detailPassport'),
            `${employee.passport_series ?? ''} ${employee.passport_number ?? ''}`.trim(),
          )}
          {row(t('employees.fieldPassportGiven'), employee.passport_given_by)}
          {row(t('employees.detailPassportDate'), formatDate(employee.passport_given_date))}
          {row(t('employees.detailBirthDate'), formatDate(employee.birth_date))}
          {row(t('employees.detailAddressReg'), employee.address_registration)}
          {row(t('employees.detailAddressLiving'), employee.address_living)}
          {row(t('employees.detailCreatedAt'), formatDate(employee.created_at))}
          {row(t('employees.detailUpdatedAt'), formatDate(employee.updated_at))}
        </div>
      </div>
    </div>
  );
}

// ─── Photo lightbox ───────────────────────────────────────────────────────────

function PhotoLightbox({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.82)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 28,
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: 28,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
      <img
        src={url}
        alt={name}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Employees() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncConfirmEmployee, setSyncConfirmEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ employee: Employee; rect: DOMRect } | null>(
    null,
  );
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const checkboxAllRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError } = useQuery<Employee[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await API.get('/employees');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 30,
  });

  const list = useMemo(() => {
    const all = data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        e.branch?.name_uz?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const allSelected = list.length > 0 && list.every((e) => selectedIds.has(e.id));
  const someSelected = list.some((e) => selectedIds.has(e.id)) && !allSelected;

  useEffect(() => {
    if (checkboxAllRef.current) checkboxAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSel = list.every((e) => prev.has(e.id));
      const next = new Set(prev);
      list.forEach((e) => (allSel ? next.delete(e.id) : next.add(e.id)));
      return next;
    });
  }, [list]);

  const buildFormData = (payload: EmployeePayload, photoFile?: File | null) => {
    if (!photoFile) return payload;
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    fd.append('photo', photoFile);
    return fd;
  };

  const createMutation = useCreateMutation<Employee, Error, EmployeePayload | FormData>(
    (body) =>
      API.post('/employees', body, {
        headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      }).then((r) => r.data),
    [QUERY_KEY],
  );

  const updateMutation = useMutation<
    Employee,
    Error,
    { id: number; body: EmployeePayload | FormData }
  >({
    mutationFn: ({ id, body }) =>
      API.post(`/employees/${id}/sync-hikvision`, body, {
        headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useDeleteMutation<Employee, Error, number>(
    (id) => API.delete(`/employees/${id}`).then((r) => r.data),
    [QUERY_KEY],
  );

  const handleSave = useCallback(
    async (payload: EmployeePayload, id?: number, photoFile?: File | null) => {
      const body = buildFormData(payload, photoFile);
      try {
        if (id) {
          await updateMutation.mutateAsync({ id, body });
          notifications.show({
            color: 'green',
            title: t('employees.notifySuccess'),
            message: t('employees.notifyUpdated'),
          });
          setEditEmployee(null);
        } else {
          await createMutation.mutateAsync(body);
          notifications.show({
            color: 'green',
            title: t('employees.notifySuccess'),
            message: t('employees.notifyAdded'),
          });
          setShowAdd(false);
        }
      } catch {
        // API interceptor shows error notification
      }
    },
    [createMutation, updateMutation, t],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteEmployee) return;
    try {
      await deleteMutation.mutateAsync(deleteEmployee.id);
      notifications.show({
        color: 'green',
        title: t('employees.notifySuccess'),
        message: t('employees.notifyDeleted'),
      });
      setDeleteEmployee(null);
    } catch {
      // API interceptor handles notification
    }
  }, [deleteEmployee, deleteMutation, t]);

  const handleSyncEmployee = useCallback(async () => {
    if (!syncConfirmEmployee) return;
    setSyncingId(syncConfirmEmployee.id);
    setSyncConfirmEmployee(null);
    try {
      await API.post(`/employees/${syncConfirmEmployee.id}/sync-hikvision`);
      notifications.show({
        color: 'green',
        title: t('employees.notifySuccess'),
        message: `${syncConfirmEmployee.full_name} ${t('employees.notifySynced')}`,
      });
    } catch {
      // API interceptor handles notification
    } finally {
      setSyncingId(null);
    }
  }, [syncConfirmEmployee, t]);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => API.delete(`/employees/${id}`)));
      notifications.show({
        color: 'green',
        title: t('employees.notifySuccess'),
        message: `${selectedIds.size} ${t('employees.notifyBulkDeleted')}`,
      });
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      // API interceptor handles notification
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds, queryClient, t]);

  return (
    <section className="users container">
      <h1 className="main-title">{t('employees.pageTitle')}</h1>

      <div className="users-filters">
        <button type="button" className="add-new-user" onClick={() => setShowAdd(true)}>
          {t('employees.add')}
        </button>
        <button
          type="button"
          className="delete-all"
          disabled={selectedIds.size === 0}
          onClick={() => setShowBulkDelete(true)}
        >
          {t('employees.delete')}
        </button>
        <input
          placeholder={t('employees.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#7a8fa6' }}>
          {t('employees.loading')}
        </div>
      )}
      {isError && (
        <div style={{ padding: 40, textAlign: 'center', color: '#e70a0a' }}>
          {t('employees.error')}
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#7a8fa6' }}>
          {t('employees.noData')}
        </div>
      )}

      {!isLoading && !isError && list.length > 0 && (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: 46 }}>
                  <input
                    ref={checkboxAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#003366' }}
                  />
                </th>
                <th>ID</th>
                <th style={{ textAlign: 'left' }}>{t('employees.tableFish')}</th>
                <th>{t('employees.tableBranch')}</th>
                <th>{t('employees.tablePhone')}</th>
                <th>{t('employees.tableCreatedAt')}</th>
                <th>{t('employees.tableUpdatedAt')}</th>
                <th>{t('employees.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((employee) => (
                <tr
                  key={employee.id}
                  style={selectedIds.has(employee.id) ? { background: '#eef4ff' } : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => toggleOne(employee.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#003366' }}
                    />
                  </td>
                  <td>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setTooltipAnchor(
                          tooltipAnchor?.employee.id === employee.id
                            ? null
                            : {
                                employee,
                                rect: (e.currentTarget as HTMLElement).getBoundingClientRect(),
                              },
                        );
                      }}
                      style={{
                        fontWeight: 600,
                        color: '#003366',
                        cursor: 'pointer',
                        textDecoration: 'underline dotted',
                      }}
                    >
                      {employee.id}
                    </span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={employee.photo_url}
                        alt={employee.full_name}
                        onClick={() =>
                          setLightboxUrl({ url: employee.photo_url, name: employee.full_name })
                        }
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                          cursor: 'zoom-in',
                        }}
                      />
                      <span
                        onClick={() => setDetailEmployee(employee)}
                        style={{ fontWeight: 500, cursor: 'pointer', color: '#003366' }}
                      >
                        {employee.full_name}
                      </span>
                    </div>
                  </td>
                  <td>{employee.branch?.name_uz ?? '-'}</td>
                  <td>{employee.phone}</td>
                  <td>{formatDate(employee.created_at)}</td>
                  <td>{formatDate(employee.updated_at)}</td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        title={t('employees.syncTooltip')}
                        className="archive-restore-btn"
                        onClick={() => setSyncConfirmEmployee(employee)}
                        disabled={syncingId === employee.id}
                        style={{ fontSize: 17, color: '#003366' }}
                      >
                        <i
                          className={`fa-solid fa-rotate${syncingId === employee.id ? ' fa-spin' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        title={t('employees.editTooltip')}
                        className="user-edit-btn"
                        onClick={() => setEditEmployee(employee)}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        title={t('employees.deleteTooltip')}
                        className="user-delete-btn"
                        onClick={() => setDeleteEmployee(employee)}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <EmployeeModal
          initial={{ ...EMPTY_FORM }}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          loading={createMutation.isPending}
        />
      )}

      {editEmployee && (
        <EmployeeModal
          initial={{
            id: editEmployee.id,
            photo_url: editEmployee.photo_url,
            first_name: editEmployee.first_name,
            last_name: editEmployee.last_name,
            middle_name: editEmployee.middle_name,
            branch_id: editEmployee.branch_id,
            pinfl: editEmployee.pinfl,
            passport_series: editEmployee.passport_series,
            passport_number: editEmployee.passport_number,
            passport_given_date: editEmployee.passport_given_date,
            passport_given_by: editEmployee.passport_given_by,
            birth_date: editEmployee.birth_date,
            phone: editEmployee.phone,
            address_registration: editEmployee.address_registration,
            address_living: editEmployee.address_living,
          }}
          branches={branches}
          onClose={() => setEditEmployee(null)}
          onSave={handleSave}
          loading={updateMutation.isPending}
        />
      )}

      {deleteEmployee && (
        <DeleteModal
          employeeName={deleteEmployee.full_name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteEmployee(null)}
          loading={deleteMutation.isPending}
        />
      )}

      {showBulkDelete && (
        <DeleteModal
          employeeName={`${selectedIds.size} ta`}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDelete(false)}
          loading={bulkDeleting}
        />
      )}

      {syncConfirmEmployee && (
        <div className="modal-overlay">
          <div className="modal small" style={{ width: 380 }}>
            <h2 className="modal-title" style={{ marginTop: 0 }}>
              {t('employees.syncConfirmTitle')}
            </h2>
            <p style={{ textAlign: 'center', color: '#444', marginBottom: 0 }}>
              <strong>{syncConfirmEmployee.full_name}</strong> {t('employees.syncConfirmText')}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={handleSyncEmployee}
                disabled={syncingId === syncConfirmEmployee.id}
              >
                {syncingId === syncConfirmEmployee.id
                  ? t('employees.syncing')
                  : t('employees.syncConfirmBtn')}
              </button>
              <button type="button" className="cancel" onClick={() => setSyncConfirmEmployee(null)}>
                {t('employees.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tooltipAnchor && (
        <IdTooltip
          employee={tooltipAnchor.employee}
          anchorRect={tooltipAnchor.rect}
          onClose={() => setTooltipAnchor(null)}
        />
      )}

      {detailEmployee && (
        <EmployeeDetailCard employee={detailEmployee} onClose={() => setDetailEmployee(null)} />
      )}

      {lightboxUrl && (
        <PhotoLightbox
          url={lightboxUrl.url}
          name={lightboxUrl.name}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </section>
  );
}
