import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import '../users/users.css';
import { useTranslation } from 'react-i18next';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import { useOptions } from '../../hooks/useOptions';

interface Commission {
  id: number;
  branch_id: number;
  payment_method: string;
  commission_percent: string | number;
  effective_date: string;
  expired_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  payment_method: string;
  commission_percent: string;
  effective_date: string;
  expired_date: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm: FormData = {
  payment_method: '',
  commission_percent: '',
  effective_date: '',
  expired_date: '',
  notes: '',
  is_active: true,
  created_at: '',
  updated_at: '',
};

const PAYMENT_METHODS = ['cash', 'card', 'bank', 'click', 'paynet'];

const formatDateTime = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toLocalDateTimeInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toApiDateTime = (dt: string) => {
  if (!dt) return undefined;
  const base = dt.replace('T', ' ');
  return base.length === 16 ? base + ':00' : base;
};

const Commissions = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [branchId, setBranchId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingItem, setEditingItem] = useState<Commission | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [selected, setSelected] = useState<number[]>([]);
  const [viewItem, setViewItem] = useState<Commission | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);

  const { data: branches } = useOptions('branches');

  const { data: commissions, isLoading } = useQuery<Commission[]>({
    queryKey: ['commissions', branchId],
    queryFn: async () => {
      const { data } = await API.get(`/branches/${branchId}/commissions`);
      return data.data ?? data;
    },
    enabled: !!branchId,
  });

  const getCommissionMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.get(`/branches/${branchId}/commissions/${id}`);
      return (data.data ?? data) as Commission;
    },
    onSuccess: (item) => {
      setEditingItem(item);
      setFormData({
        payment_method: item.payment_method,
        commission_percent: String(item.commission_percent ?? ''),
        effective_date: toLocalDateTimeInput(item.effective_date),
        expired_date: toLocalDateTimeInput(item.expired_date),
        notes: item.notes || '',
        is_active: item.is_active,
        created_at: toLocalDateTimeInput(item.created_at),
        updated_at: toLocalDateTimeInput(item.updated_at),
      });
      setShowModal(true);
    },
  });

  const buildPayload = () => {
    const payload: any = {
      payment_method: formData.payment_method,
      commission_percent: Number(formData.commission_percent),
      effective_date: toApiDateTime(formData.effective_date),
      expired_date: formData.expired_date ? toApiDateTime(formData.expired_date) : null,
      notes: formData.notes,
      is_active: formData.is_active,
    };
    if (formData.created_at) payload.created_at = toApiDateTime(formData.created_at);
    if (formData.updated_at) payload.updated_at = toApiDateTime(formData.updated_at);
    return payload;
  };

  const createMutation = useMutation({
    mutationFn: async () => API.post(`/branches/${branchId}/commissions`, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', branchId] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) =>
      API.put(`/branches/${branchId}/commissions/${id}`, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', branchId] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/branches/${branchId}/commissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions', branchId] });
    },
  });

  const confirmDelete = () => {
    if (deleteTarget === 'all') {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    } else if (typeof deleteTarget === 'number') {
      deleteMutation.mutate(deleteTarget);
      setSelected((p) => p.filter((x) => x !== deleteTarget));
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (item: Commission) => {
    getCommissionMutation.mutate(item.id);
  };

  const paymentMethodLabel = (method: string) => {
    const key = PAYMENT_METHODS.includes(method) ? method : null;
    return key ? t(`commissions.methods.${key}`) : method;
  };

  const sortedCommissions = [...(commissions || [])].sort((a, b) =>
    sortAsc ? a.id - b.id : b.id - a.id,
  );

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? sortedCommissions.map((c) => c.id) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <section className="users container">
      <h1 className="main-title">{t('commissions.mainTitle')}</h1>

      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{editingItem ? t('commissions.editTitle') : t('commissions.addTitle')}</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id });
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>{t('commissions.paymentType')}</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  required
                >
                  <option value="">{t('commissions.choose')}</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {t(`commissions.methods.${m}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subcategory-form-group">
                <label>{t('commissions.commissionPercent')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commission_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, commission_percent: e.target.value })
                  }
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t('commissions.effectiveDate')}</label>
                <input
                  type="datetime-local"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t('commissions.expiredDate')}</label>
                <input
                  type="datetime-local"
                  value={formData.expired_date}
                  onChange={(e) => setFormData({ ...formData, expired_date: e.target.value })}
                />
              </div>

              <div className="subcategory-form-group">
                <label>{t('commissions.notes')}</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  {t('commissions.active')}
                </label>
              </div>

              {editingItem && (
                <>
                  <div className="subcategory-form-group">
                    <label>{t('commissions.createdAt')}</label>
                    <input
                      type="datetime-local"
                      value={formData.created_at}
                      onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                    />
                  </div>
                  <div className="subcategory-form-group">
                    <label>{t('commissions.updatedAt')}</label>
                    <input
                      type="datetime-local"
                      value={formData.updated_at}
                      onChange={(e) => setFormData({ ...formData, updated_at: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  className="primary"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? t('commissions.saving')
                    : t('commissions.save')}
                </button>
                <button type="button" className="cancel" onClick={resetForm}>
                  {t('commissions.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('commissions.confirmDelete')}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t('commissions.delete')}
              </button>
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('commissions.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 600, padding: 32, borderRadius: 8 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 32, color: '#003366' }}>
              {t('commissions.viewTitle')}
            </h2>

            <div style={{ display: 'flex', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.paymentType')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {paymentMethodLabel(viewItem.payment_method)}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.commissionPercent')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {viewItem.commission_percent}%
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.status')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {viewItem.is_active ? t('commissions.active') : t('commissions.inactive')}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>ID:</p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>#{viewItem.id}</p>
              </div>
            </div>

            <div style={{ display: 'flex', marginBottom: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.effectiveDate')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {formatDateTime(viewItem.effective_date)}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.expiredDate')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {formatDateTime(viewItem.expired_date)}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                {t('commissions.notes')}:
              </p>
              <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                {viewItem.notes || '-'}
              </p>
            </div>

            <div style={{ display: 'flex', marginBottom: 32 }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.createdAt')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {formatDateTime(viewItem.created_at)}
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                  {t('commissions.updatedAt')}:
                </p>
                <p style={{ color: '#003366', fontWeight: 500, fontSize: 16 }}>
                  {formatDateTime(viewItem.updated_at)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setViewItem(null)}
              style={{
                border: '1px solid #003366',
                background: 'transparent',
                color: '#003366',
                padding: '8px 32px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                width: '100%',
              }}
            >
              {t('commissions.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="users-filters">
        <Protected permission="commissions.create">
          <button className="add-new-user" disabled={!branchId} onClick={openAddModal}>
            {t('commissions.addBtn')}
          </button>
        </Protected>

        <Protected permission="commissions.delete">
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={() => {
              setDeleteTarget('all');
              setShowDeleteModal(true);
            }}
          >
            {t('commissions.delete')}
          </button>
        </Protected>

        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">{t('commissions.chooseBranch')}</option>
          {branches?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === sortedCommissions.length && sortedCommissions.length > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th>{t('commissions.paymentType')}</th>
              <th>{t('commissions.commissionPercent')}</th>
              <th>{t('commissions.status')}</th>
              <th>{t('commissions.createdAt')}</th>
              <th>{t('commissions.updatedAt')}</th>
              <th>{t('commissions.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {!branchId ? (
              <EmptyState colSpan={8} message={t('commissions.selectBranchFirst')} />
            ) : isLoading ? (
              <TableSkeleton rowCount={8} columnCount={8} />
            ) : sortedCommissions.length ? (
              sortedCommissions.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{paymentMethodLabel(item.payment_method)}</td>
                  <td>{item.commission_percent}%</td>
                  <td>{item.is_active ? t('commissions.active') : t('commissions.inactive')}</td>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td>{formatDateTime(item.updated_at)}</td>
                  <td className="actions">
                    <button className="user-view-btn" onClick={() => setViewItem(item)}>
                      <i className="fa-solid fa-eye"></i>
                    </button>
                    <Protected permission="commissions.edit">
                      <button className="user-edit-btn" onClick={() => openEditModal(item)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    </Protected>
                    <Protected permission="commissions.delete">
                      <button
                        className="user-delete-btn"
                        onClick={() => {
                          setDeleteTarget(item.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </Protected>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={8} message={t('commissions.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Commissions;
