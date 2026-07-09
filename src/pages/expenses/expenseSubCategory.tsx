import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import '../users/users.css';
import './expenses.css';
import '../finance/finance.css';
import { useTranslation } from 'react-i18next';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { getLocalized } from '../../utils/getLocalized';
import { Protected } from '../../components/Protected';
import { useOptions } from '../../hooks/useOptions';

interface ExpenseCategory {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}

interface ExpenseSubcategory {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
  expense_category_id: number;
  category?: ExpenseCategory;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  expense_category_id: string;
  created_at: string;
  updated_at: string;
}

const emptyForm: FormData = {
  name: '',
  expense_category_id: '',
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

const toApiDateTime = (dt: string) => {
  if (!dt) return undefined;
  const base = dt.replace('T', ' ');
  return base.length === 16 ? base + ':00' : base;
};

const ExpensesSubcategory = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingItem, setEditingItem] = useState<ExpenseSubcategory | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const { data: subcategories, isLoading } = useQuery<ExpenseSubcategory[]>({
    queryKey: ['expense-subcategories'],
    queryFn: async () => {
      const { data } = await API.get('/expense-subcategories');
      return data.data ?? data;
    },
  });

  const { data: categories } = useOptions('expense-categories');

  const createMutation = useMutation({
    mutationFn: async () =>
      API.post('/expense-subcategories', {
        name_uz: formData.name,
        expense_category_id: formData.expense_category_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-subcategories'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const payload: any = {
        name_uz: formData.name,
        expense_category_id: formData.expense_category_id,
      };
      if (formData.created_at) payload.created_at = toApiDateTime(formData.created_at);
      if (formData.updated_at) payload.updated_at = toApiDateTime(formData.updated_at);
      return API.put(`/expense-subcategories/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-subcategories'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/expense-subcategories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-subcategories'] });
    },
  });

  const resetForm = () => {
    setShowAddModal(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const openEditModal = (item: ExpenseSubcategory) => {
    setEditingItem(item);
    setFormData({
      name: item.name_uz,
      expense_category_id: String(item.expense_category_id),
      created_at: toLocalDateTimeInput(item.created_at),
      updated_at: toLocalDateTimeInput(item.updated_at),
    });
    setShowAddModal(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === 'all') {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    }
    if (typeof deleteTarget === 'number') {
      deleteMutation.mutate(deleteTarget);
      setSelected((p) => p.filter((x) => x !== deleteTarget));
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? subcategories?.map((c) => c.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <section className="users container">
      <h1 className="main-title">{t('expenses.expenseSubCategory')}</h1>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>
              {editingItem ? t('expenses.editSubCategory') : t('expenses.expenseSubCategory')}
            </h1>

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
                <label>{t('expenses.expenseCategory')}</label>
                <select
                  value={formData.expense_category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, expense_category_id: e.target.value })
                  }
                  required
                >
                  <option value="">{t('expenses.choose')}</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="subcategory-form-group">
                <label>{t('expenses.expenseSubCategoryName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {editingItem && (
                <>
                  <div className="subcategory-form-group">
                    <label>{t('expenses.createdAt')}</label>
                    <input
                      type="datetime-local"
                      value={formData.created_at}
                      onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
                    />
                  </div>
                  <div className="subcategory-form-group">
                    <label>{t('expenses.updatedAt')}</label>
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
                    ? t('expenses.saving')
                    : t('expenses.save')}
                </button>
                <button type="button" className="cancel" onClick={resetForm}>
                  {t('expenses.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('expenses.confirmDelete')}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t('expenses.delete')}
              </button>
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('expenses.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <Protected permission="expense_subcategories.create">
          <button className="add-new-user" onClick={() => setShowAddModal(true)}>
            {t('expenses.addBtn')}
          </button>
        </Protected>
        <Protected permission="expense_subcategories.delete">
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={() => {
              setDeleteTarget('all');
              setShowDeleteModal(true);
            }}
          >
            {t('expenses.delete')}
          </button>
        </Protected>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === (subcategories?.length || 0) &&
                    (subcategories?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th>{t('expenses.subCategory')}</th>
              <th>{t('expenses.category')}</th>
              <th>{t('expenses.createdAt')}</th>
              <th>{t('expenses.updatedAt')}</th>
              <th>{t('expenses.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : subcategories?.length ? (
              [...(subcategories || [])]
                .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id))
                .map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                      />
                    </td>
                    <td>{item.id}</td>
                    <td>{getLocalized(item, 'name', i18n.language)}</td>
                    <td>
                      {item.category ? getLocalized(item.category, 'name', i18n.language) : '-'}
                    </td>
                    <td>{formatDateTime(item.created_at)}</td>
                    <td>{formatDateTime(item.updated_at)}</td>
                    <td className="actions">
                      <Protected permission="expense_subcategories.edit">
                        <button className="user-edit-btn" onClick={() => openEditModal(item)}>
                          <i className="fa-solid fa-pen"></i>
                        </button>
                      </Protected>
                      <Protected permission="expense_subcategories.delete">
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
              <EmptyState colSpan={7} message={t('expenses.subCategoryNotFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ExpensesSubcategory;
