import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rejectionReasonAPI,
  type RejectionReason,
  type RejectionReasonPayload,
} from '../../api/rejection-reason.api';
import '../users/users.css';
import '../expenses/expenses.css';
import { useTranslation } from 'react-i18next';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';

interface FormData {
  name: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

const emptyForm: FormData = {
  name: '',
  comment: '',
  created_at: '',
  updated_at: '',
};

const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toLocalDateTimeInput = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const RefusalReasons = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingItem, setEditingItem] = useState<RejectionReason | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: reasons, isLoading } = useQuery<RejectionReason[]>({
    queryKey: ['rejection-reasons'],
    queryFn: rejectionReasonAPI.getAll,
  });

  const sorted = useMemo(() => (reasons || []).slice().sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id), [reasons, sortAsc]);

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: RejectionReasonPayload = {
        name: formData.name,
        comment: formData.comment || undefined,
      };
      return rejectionReasonAPI.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rejection-reasons'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => {
      const payload: RejectionReasonPayload = {
        name: data.name,
        comment: data.comment || undefined,
      };
      if (data.created_at) {
        payload.created_at = new Date(data.created_at).toISOString();
      }
      if (data.updated_at) {
        payload.updated_at = new Date(data.updated_at).toISOString();
      }
      return rejectionReasonAPI.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rejection-reasons'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: rejectionReasonAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rejection-reasons'] });
    },
  });

  const openEditModal = (item: RejectionReason) => {
    setEditingItem(item);
    setFormData({
      name: item.name_uz || '',
      comment: item.comment || '',
      created_at: toLocalDateTimeInput(item.created_at),
      updated_at: toLocalDateTimeInput(item.updated_at),
    });
    setShowAddModal(true);
  };

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

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? reasons?.map((r) => r.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetForm = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  return (
    <section className="users container">
      <h1 className="main-title">{t('refusalReasons.title')}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>{editingItem ? t('refusalReasons.editTitle') : t('refusalReasons.addTitle')}</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, data: formData });
                } else {
                  createMutation.mutate();
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>{t('refusalReasons.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('refusalReasons.name')}
                  required
                />
              </div>

              {editingItem && (
                <>
                  <div className="subcategory-form-group">
                    <label>{t('refusalReasons.comment')}</label>
                    <input
                      type="text"
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      placeholder={t('refusalReasons.comment')}
                    />
                  </div>

                  <div className="subcategory-form-group">
                    <label>{t('refusalReasons.createdAt')}</label>
                    <input
                      type="datetime-local"
                      value={formData.created_at}
                      onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                    />
                  </div>

                  <div className="subcategory-form-group">
                    <label>{t('refusalReasons.updatedAt')}</label>
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
                    ? t('refusalReasons.saving')
                    : t('refusalReasons.save')}
                </button>

                <button type="button" className="cancel" onClick={resetForm}>
                  {t('refusalReasons.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('refusalReasons.confirmDelete')}</h3>

            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t('refusalReasons.delete')}
              </button>

              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('refusalReasons.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowAddModal(true)}>
          {t('refusalReasons.addBtn')}
        </button>

        <button
          className="delete-all"
          disabled={!selected.length}
          onClick={() => {
            setDeleteTarget('all');
            setShowDeleteModal(true);
          }}
        >
          {t('refusalReasons.delete')}
        </button>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === (reasons?.length || 0) && (reasons?.length || 0) > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc(p => !p)}>ID {sortAsc ? '↑' : '↓'}</th>
              <th>{t('refusalReasons.name')}</th>
              <th>{t('refusalReasons.comment')}</th>
              <th>{t('refusalReasons.createdAt')}</th>
              <th>{t('refusalReasons.updatedAt')}</th>
              <th>{t('refusalReasons.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : sorted.length ? (
              sorted.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{item.name_uz}</td>
                  <td>{item.comment || '-'}</td>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td>{formatDateTime(item.updated_at)}</td>

                  <td className="actions">
                    <button className="user-edit-btn" onClick={() => openEditModal(item)}>
                      <i className="fa-solid fa-pen"></i>
                    </button>

                    <button
                      className="user-delete-btn"
                      onClick={() => {
                        setDeleteTarget(item.id);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={7} message={t('refusalReasons.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RefusalReasons;
