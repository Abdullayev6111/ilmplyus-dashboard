import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import '../users/users.css';
import './courses.css';
import Loading from '../../components/Loading';
import { useTranslation } from 'react-i18next';

interface Level {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: number;
  name: string;
  description: string;
  branch_id: number;
  level_id: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  level: Level;
}

interface CourseFormData {
  name: string;
  level_id: string;
}

const Courses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<Course | null>(null);

  const [formData, setFormData] = useState<CourseFormData>({
    name: '',
    level_id: '',
  });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await API.get<Course[]>('/courses');
      return data;
    },
  });

  const levels = useMemo<Level[]>(() => {
    if (!courses) return [];
    const map = new Map<number, Level>();
    courses.forEach((c) => {
      if (c.level && !map.has(c.level.id)) {
        map.set(c.level.id, c.level);
      }
    });
    return Array.from(map.values());
  }, [courses]);

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; level_id: number }) =>
      API.post('/courses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: number; payload: { name: string; level_id: number } }) =>
      API.put(`/courses/${params.id}`, params.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => API.delete(`/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ name: '', level_id: '' });
  };

  const openEditModal = (item: Course) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      level_id: String(item.level_id),
    });
    setShowModal(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === 'all') {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    }

    if (typeof deleteTarget === 'number') {
      deleteMutation.mutate(deleteTarget);
      setSelected((prev) => prev.filter((x) => x !== deleteTarget));
    }

    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? (courses?.map((c) => c.id) ?? []) : []);

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (isLoading) return <Loading />;

  return (
    <section className="users container">
      <h1 className="main-title">Kurslar</h1>

      {showModal && (
        <div className="modal-overlay">
          <div className="expenses-subcategory">
            <h1>Kurs</h1>

            <form
              className="subcategory-form"
              onSubmit={(e) => {
                e.preventDefault();

                const payload = {
                  name: formData.name.trim(),
                  level_id: Number(formData.level_id),
                };

                if (editingItem) {
                  updateMutation.mutate({ id: editingItem.id, payload });
                } else {
                  createMutation.mutate(payload);
                }
              }}
            >
              <div className="subcategory-form-group">
                <label>Kurs nomi</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="subcategory-form-group">
                <label>Level</label>
                <select
                  value={formData.level_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      level_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Tanlang</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel" onClick={resetForm}>
                  {t('expenses.cancel')}
                </button>

                <button className="primary" type="submit">
                  {t('expenses.save')}
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
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('expenses.cancel')}
              </button>

              <button className="danger" onClick={confirmDelete}>
                {t('expenses.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button className="add-new-user" onClick={() => setShowModal(true)}>
          {t('expenses.addBtn')}
        </button>

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
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === (courses?.length ?? 0) && (courses?.length ?? 0) > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              <th>Kurs nomi</th>
              <th>Level</th>
              <th>Yaratilgan sana</th>
              <th>{t('expenses.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {courses && courses.length > 0 ? (
              courses.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.level?.name ?? '-'}</td>
                  <td>{new Date(item.created_at).toLocaleDateString()}</td>
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
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>
                  {t('expenses.notFound')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Courses;
