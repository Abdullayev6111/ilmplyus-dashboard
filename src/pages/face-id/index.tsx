import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API } from '../../api/api';
import '../users/users.css';
import './face-id.css';
import type { HikvisionDevice, HikvisionDevicePayload } from '../../types/hikvision.types';
import { useOptions, type OptionItem } from '../../hooks/useOptions';
import { useCreateMutation, useUpdateMutation, useDeleteMutation } from '../../hooks/useMutations';

const QUERY_KEY = ['hikvision-devices'];

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

const EMPTY_FORM: HikvisionDevicePayload = {
  name: '',
  ip_address: '',
  port: 80,
  username: '',
  password: '',
  branch_id: 0,
};

// ─── Delete confirm modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  deviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DeleteModal({ deviceName, onConfirm, onCancel, loading }: DeleteModalProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay">
      <div className="modal small" style={{ width: 360 }}>
        <h2 className="modal-title" style={{ marginTop: 0 }}>
          {t('faceId.deleteModalTitle')}
        </h2>
        <p style={{ textAlign: 'center', color: '#444', marginBottom: 0 }}>
          <strong>{deviceName}</strong> {t('faceId.deleteModalText')}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="danger"
            style={{ background: '#c90000', color: '#fff' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t('faceId.deleting') : t('faceId.delete')}
          </button>
          <button type="button" className="cancel" onClick={onCancel} disabled={loading}>
            {t('faceId.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

interface DeviceModalProps {
  initial: HikvisionDevicePayload & { id?: number };
  branches: OptionItem[];
  onClose: () => void;
  onSave: (payload: HikvisionDevicePayload, id?: number) => void;
  loading: boolean;
}

function DeviceModal({ initial, branches, onClose, onSave, loading }: DeviceModalProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(initial.id);
  const [form, setForm] = useState<HikvisionDevicePayload>({
    name: initial.name,
    ip_address: initial.ip_address,
    port: initial.port,
    username: initial.username,
    password: initial.password ?? '',
    branch_id: initial.branch_id,
  });

  const set =
    (field: keyof HikvisionDevicePayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({
        ...prev,
        [field]:
          field === 'port' || field === 'branch_id' ? Number(e.target.value) : e.target.value,
      }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form, initial.id);
  };

  return (
    <div className="modal-overlay">
      <div className="modal fid-modal">
        <h2 className="modal-title" style={{ marginTop: 0 }}>
          {isEdit ? t('faceId.editModalTitle') : t('faceId.addModalTitle')}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="fid-form-grid">
            <div className="fid-form-group">
              <label>{t('faceId.fieldName')}</label>
              <input
                required
                value={form.name}
                onChange={set('name')}
                placeholder={t('faceId.namePlaceholder')}
              />
            </div>
            <div className="fid-form-group">
              <label>{t('faceId.fieldBranch')}</label>
              <select required value={form.branch_id || ''} onChange={set('branch_id')}>
                <option value="">{t('faceId.selectPlaceholder')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fid-form-group">
              <label>{t('faceId.fieldIp')}</label>
              <input
                required
                value={form.ip_address}
                onChange={set('ip_address')}
                placeholder="192.168.1.100"
              />
            </div>
            <div className="fid-form-group">
              <label>{t('faceId.fieldPort')}</label>
              <input
                required
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={set('port')}
              />
            </div>
            <div className="fid-form-group">
              <label>{t('faceId.fieldUsername')}</label>
              <input
                required
                value={form.username}
                onChange={set('username')}
                placeholder="admin"
              />
            </div>
            <div className="fid-form-group">
              <label>
                {t('faceId.fieldPassword')}{' '}
                {isEdit && (
                  <span style={{ fontSize: 11, color: '#888' }}>
                    {t('faceId.passwordChangeHint')}
                  </span>
                )}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder={isEdit ? '••••••••' : t('faceId.fieldPassword')}
                {...(!isEdit && { required: true })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? t('faceId.saving') : isEdit ? t('faceId.save') : t('faceId.save')}
            </button>
            <button type="button" className="cancel" onClick={onClose} disabled={loading}>
              {t('faceId.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Clear confirm modal ──────────────────────────────────────────────────────

interface ClearConfirmModalProps {
  deviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function ClearConfirmModal({ deviceName, onConfirm, onCancel, loading }: ClearConfirmModalProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay">
      <div className="modal small" style={{ width: 380 }}>
        <h2 className="modal-title" style={{ marginTop: 0, color: '#b91c1c' }}>
          {t('faceId.clearModalTitle')}
        </h2>
        <p style={{ textAlign: 'center', color: '#444', marginBottom: 0 }}>
          <strong>{deviceName}</strong> {t('faceId.clearModalText')}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 600, cursor: 'pointer' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t('faceId.clearing') : t('faceId.clearConfirmBtn')}
          </button>
          <button type="button" className="cancel" onClick={onCancel} disabled={loading}>
            {t('faceId.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Debug modal ──────────────────────────────────────────────────────────────

interface DebugModalProps {
  device: HikvisionDevice;
  onClose: () => void;
}

function DebugModal({ device, onClose }: DebugModalProps) {
  const { t } = useTranslation();
  const [employeeNo, setEmployeeNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDebug = async () => {
    if (!employeeNo.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const { data } = await API.get(
        `/hikvision-devices/${device.id}/debug/${employeeNo.trim()}`,
      );
      setResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ width: 560 }}>
        <h2 className="modal-title" style={{ marginTop: 0 }}>
          {t('faceId.debugTitle')} — {device.name}
        </h2>

        <input
          value={employeeNo}
          onChange={(e) => setEmployeeNo(e.target.value)}
          placeholder={t('faceId.debugInputPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && handleDebug()}
          style={{
            width: '100%',
            height: 42,
            padding: '0 14px',
            border: '1.5px solid #d0d9e6',
            borderRadius: 10,
            fontSize: 14,
            color: '#003366',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 16,
          }}
        />

        {result && (
          <pre
            style={{
              background: '#f4f7fb',
              border: '1px solid #d0d9e6',
              borderRadius: 10,
              padding: 16,
              fontSize: 12,
              color: '#003366',
              maxHeight: 280,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              marginBottom: 16,
            }}
          >
            {result}
          </pre>
        )}
        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              padding: '12px 16px',
              color: '#b91c1c',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}
        {!result && !error && !loading && (
          <div style={{ padding: '12px 0 16px', textAlign: 'center', color: '#a0b0c8', fontSize: 13 }}>
            {t('faceId.debugEmptyHint')}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="primary"
            onClick={handleDebug}
            disabled={loading || !employeeNo.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: loading || !employeeNo.trim() ? 0.6 : 1 }}
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-magnifying-glass" />}
            {t('faceId.debugSearch')}
          </button>
          <button type="button" className="cancel" onClick={onClose}>
            {t('faceId.debugClose')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FaceId() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editDevice, setEditDevice] = useState<HikvisionDevice | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<HikvisionDevice | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [clearingId, setClearingId] = useState<number | null>(null);
  const [clearConfirmDevice, setClearConfirmDevice] = useState<HikvisionDevice | null>(null);
  const [syncConfirmDevice, setSyncConfirmDevice] = useState<HikvisionDevice | null>(null);
  const [debugDevice, setDebugDevice] = useState<HikvisionDevice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const checkboxAllRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError } = useQuery<HikvisionDevice[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await API.get('/hikvision-devices');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
  });

  const { data: branches = [] } = useOptions('branches');

  const list = useMemo(() => {
    const all = data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.ip_address.toLowerCase().includes(q) ||
        d.branch?.name_uz?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const allSelected = list.length > 0 && list.every((d) => selectedIds.has(d.id));
  const someSelected = list.some((d) => selectedIds.has(d.id)) && !allSelected;

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
      const allSel = list.every((d) => prev.has(d.id));
      const next = new Set(prev);
      list.forEach((d) => (allSel ? next.delete(d.id) : next.add(d.id)));
      return next;
    });
  }, [list]);

  const createMutation = useCreateMutation<HikvisionDevice, Error, HikvisionDevicePayload>(
    (payload) => API.post('/hikvision-devices', payload).then((r) => r.data),
    [QUERY_KEY],
  );

  const updateMutation = useUpdateMutation<
    HikvisionDevice,
    Error,
    { id: number; payload: Partial<HikvisionDevicePayload> }
  >(
    ({ id, payload }) => API.put(`/hikvision-devices/${id}`, payload).then((r) => r.data),
    [QUERY_KEY],
  );

  const deleteMutation = useDeleteMutation<HikvisionDevice, Error, number>(
    (id) => API.delete(`/hikvision-devices/${id}`).then((r) => r.data),
    [QUERY_KEY],
  );

  const handleSave = useCallback(
    async (payload: HikvisionDevicePayload, id?: number) => {
      try {
        if (id) {
          const { password, ...rest } = payload;
          const updatePayload = password ? payload : rest;
          await updateMutation.mutateAsync({ id, payload: updatePayload });
          notifications.show({
            color: 'green',
            title: t('faceId.notifySuccess'),
            message: t('faceId.notifyUpdated'),
          });
          setEditDevice(null);
        } else {
          await createMutation.mutateAsync(payload);
          notifications.show({
            color: 'green',
            title: t('faceId.notifySuccess'),
            message: t('faceId.notifyAdded'),
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
    if (!deleteDevice) return;
    try {
      await deleteMutation.mutateAsync(deleteDevice.id);
      notifications.show({
        color: 'green',
        title: t('faceId.notifySuccess'),
        message: t('faceId.notifyDeleted'),
      });
      setDeleteDevice(null);
    } catch {
      // API interceptor handles notification
    }
  }, [deleteDevice, deleteMutation, t]);

  const handleBulkDelete = useCallback(async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => API.delete(`/hikvision-devices/${id}`)));
      notifications.show({
        color: 'green',
        title: t('faceId.notifySuccess'),
        message: `${selectedIds.size} ${t('faceId.notifyBulkDeleted')}`,
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

  const handleSyncAll = useCallback(async () => {
    if (!syncConfirmDevice) return;
    setSyncingId(syncConfirmDevice.id);
    setSyncConfirmDevice(null);
    try {
      await API.post(`/hikvision-devices/${syncConfirmDevice.id}/sync-all`);
      notifications.show({
        color: 'green',
        title: t('faceId.notifySuccess'),
        message: `${syncConfirmDevice.name} ${t('faceId.notifySynced')}`,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      // API interceptor handles notification
    } finally {
      setSyncingId(null);
    }
  }, [syncConfirmDevice, queryClient, t]);

  const handleClear = useCallback(async () => {
    if (!clearConfirmDevice) return;
    setClearingId(clearConfirmDevice.id);
    try {
      await API.post(`/hikvision-devices/${clearConfirmDevice.id}/clear`);
      notifications.show({
        color: 'green',
        title: t('faceId.notifySuccess'),
        message: `${clearConfirmDevice.name} ${t('faceId.notifyCleared')}`,
      });
      setClearConfirmDevice(null);
    } catch {
      // API interceptor handles notification
    } finally {
      setClearingId(null);
    }
  }, [clearConfirmDevice, t]);

  return (
    <section className="users container">
      <h1 className="main-title">{t('faceId.pageTitle')}</h1>

      <div className="users-filters">
        <button type="button" className="add-new-user" onClick={() => setShowAdd(true)}>
          {t('faceId.add')}
        </button>
        <button
          type="button"
          className="delete-all"
          disabled={selectedIds.size === 0}
          onClick={() => setShowBulkDelete(true)}
        >
          {t('faceId.delete')}
        </button>
        <input
          placeholder={t('faceId.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#7a8fa6' }}>
          {t('faceId.loading')}
        </div>
      )}
      {isError && (
        <div style={{ padding: 40, textAlign: 'center', color: '#e70a0a' }}>
          {t('faceId.error')}
        </div>
      )}
      {!isLoading && !isError && list.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#7a8fa6' }}>
          {t('faceId.noData')}
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
                <th>{t('faceId.tableId')}</th>
                <th style={{ textAlign: 'left' }}>{t('faceId.tableName')}</th>
                <th>{t('faceId.tableBranch')}</th>
                <th>{t('faceId.tablePort')}</th>
                <th>{t('faceId.tableIp')}</th>
                <th>{t('faceId.tableStatus')}</th>
                <th>{t('faceId.tableCreatedAt')}</th>
                <th>{t('faceId.tableUpdatedAt')}</th>
                <th>{t('faceId.tableActions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((device) => (
                <tr
                  key={device.id}
                  style={selectedIds.has(device.id) ? { background: '#eef4ff' } : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(device.id)}
                      onChange={() => toggleOne(device.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#003366' }}
                    />
                  </td>
                  <td style={{ fontWeight: 600, color: '#003366' }}>{device.id}</td>
                  <td style={{ textAlign: 'left', fontWeight: 500 }}>{device.name}</td>
                  <td>{device.branch?.name_uz ?? '-'}</td>
                  <td>{device.port}</td>
                  <td>{device.ip_address}</td>
                  <td>
                    <span
                      style={{
                        background: device.is_active ? '#dcfce7' : '#fef2f2',
                        color: device.is_active ? '#16a34a' : '#dc2626',
                        padding: '3px 10px',
                        borderRadius: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {device.is_active ? t('faceId.statusActive') : t('faceId.statusInactive')}
                    </span>
                  </td>
                  <td>{formatDate(device.created_at)}</td>
                  <td>{formatDate(device.updated_at)}</td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        title={t('faceId.employeesTooltip')}
                        className="archive-restore-btn"
                        onClick={() => navigate('/employees')}
                        style={{ fontSize: 17, color: '#003366' }}
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                      <button
                        type="button"
                        title={t('faceId.syncTooltip')}
                        className="archive-restore-btn"
                        onClick={() => setSyncConfirmDevice(device)}
                        disabled={syncingId === device.id}
                        style={{ fontSize: 17, color: '#003366' }}
                      >
                        <i
                          className={`fa-solid fa-rotate${syncingId === device.id ? ' fa-spin' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        title={t('faceId.debugTooltip')}
                        className="archive-restore-btn"
                        onClick={() => setDebugDevice(device)}
                        style={{ fontSize: 17, color: '#7c3aed' }}
                      >
                        <i className="fa-solid fa-bug" />
                      </button>
                      <button
                        type="button"
                        title={t('faceId.clearTooltip')}
                        className="archive-restore-btn"
                        onClick={() => setClearConfirmDevice(device)}
                        disabled={clearingId === device.id}
                        style={{ fontSize: 17, color: '#b91c1c' }}
                      >
                        <i
                          className={`fa-solid fa-eraser${clearingId === device.id ? ' fa-spin' : ''}`}
                        />
                      </button>
                      <button
                        type="button"
                        title={t('faceId.editTooltip')}
                        className="user-edit-btn"
                        onClick={() => setEditDevice(device)}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        type="button"
                        title={t('faceId.deleteTooltip')}
                        className="user-delete-btn"
                        onClick={() => setDeleteDevice(device)}
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
        <DeviceModal
          initial={{ ...EMPTY_FORM }}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSave={handleSave}
          loading={createMutation.isPending}
        />
      )}

      {editDevice && (
        <DeviceModal
          initial={{
            id: editDevice.id,
            name: editDevice.name,
            ip_address: editDevice.ip_address,
            port: editDevice.port,
            username: editDevice.username,
            password: '',
            branch_id: editDevice.branch_id,
          }}
          branches={branches}
          onClose={() => setEditDevice(null)}
          onSave={handleSave}
          loading={updateMutation.isPending}
        />
      )}

      {deleteDevice && (
        <DeleteModal
          deviceName={deleteDevice.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteDevice(null)}
          loading={deleteMutation.isPending}
        />
      )}

      {showBulkDelete && (
        <DeleteModal
          deviceName={`${selectedIds.size} ta`}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDelete(false)}
          loading={bulkDeleting}
        />
      )}

      {syncConfirmDevice && (
        <div className="modal-overlay">
          <div className="modal small" style={{ width: 380 }}>
            <h2 className="modal-title" style={{ marginTop: 0 }}>{t('faceId.syncConfirmTitle')}</h2>
            <p style={{ textAlign: 'center', color: '#444', marginBottom: 0 }}>
              <strong>{syncConfirmDevice.name}</strong> {t('faceId.syncConfirmText')}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={handleSyncAll}
                disabled={syncingId === syncConfirmDevice.id}
              >
                {syncingId === syncConfirmDevice.id ? t('faceId.syncing') : t('faceId.syncConfirmBtn')}
              </button>
              <button type="button" className="cancel" onClick={() => setSyncConfirmDevice(null)}>
                {t('faceId.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {clearConfirmDevice && (
        <ClearConfirmModal
          deviceName={clearConfirmDevice.name}
          onConfirm={handleClear}
          onCancel={() => setClearConfirmDevice(null)}
          loading={clearingId === clearConfirmDevice.id}
        />
      )}

      {debugDevice && (
        <DebugModal device={debugDevice} onClose={() => setDebugDevice(null)} />
      )}
    </section>
  );
}
