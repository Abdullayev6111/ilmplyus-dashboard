import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import '../users/users.css';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { getLocalized } from '../../utils/getLocalized';
import { Protected } from '../../components/Protected';
import { useOptions } from '../../hooks/useOptions';

interface TestCourse {
  id: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
}

interface TestLevel {
  id: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
}

interface TestBranch {
  id: number;
  name_uz: string | null;
  name_ru: string | null;
  name_en: string | null;
}

interface Test {
  id: number;
  name: string;
  course_id: number;
  level_id: number;
  branch_id: number;
  questions_count: number;
  pass_percentage: number;
  time_limit: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  course?: TestCourse;
  level?: TestLevel;
  branch?: TestBranch;
}

interface TestsResponse {
  data: Test[];
  current_page: number;
  last_page: number;
  total: number;
}

interface TestPayload {
  name: string;
  course_id: number | '';
  level_id: number | '';
  branch_id: number | '';
  questions_count: number | '';
  pass_percentage: number | '';
  time_limit: number | '';
  status: 'active' | 'inactive';
}

const emptyForm = (): TestPayload => ({
  name: '',
  course_id: '',
  level_id: '',
  branch_id: '',
  questions_count: '',
  pass_percentage: '',
  time_limit: '',
  status: 'active',
});

const Questions = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [editingItem, setEditingItem] = useState<Test | null>(null);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [formData, setFormData] = useState<TestPayload>(emptyForm());

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingItem(null);
  };

  const { data: apiData, isLoading } = useQuery<TestsResponse>({
    queryKey: ['tests'],
    queryFn: async () => {
      const { data } = await API.get('/tests');
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: coursesData } = useOptions('courses');
  const { data: levelsData } = useOptions('levels');
  const { data: branchesData } = useOptions('branches');

  const courses = coursesData || [];
  const levels = levelsData || [];
  const branches = branchesData || [];

  const createMutation = useMutation({
    mutationFn: async (payload: TestPayload) => {
      const { data } = await API.post('/tests', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TestPayload }) => {
      const { data } = await API.put(`/tests/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      setShowModal(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
    },
  });

  const filtered = useMemo(() => {
    const tests = apiData?.data || [];
    return tests
      .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id));
  }, [apiData?.data, search, sortAsc]);

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? filtered.map((t) => t.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const openEditModal = (item: Test) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      course_id: item.course_id,
      level_id: item.level_id,
      branch_id: item.branch_id,
      questions_count: item.questions_count,
      pass_percentage: item.pass_percentage,
      time_limit: item.time_limit,
      status: item.status,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="users container">
      <h1 className="main-title">{t('questions.title')}</h1>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 600, width: '100%' }}>
            <h3 className="modal-title">
              {editingItem ? t('questions.modal.editTitle') : t('questions.modal.createTitle')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>{t('questions.modal.nameLabel')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('questions.modal.namePlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('questions.modal.courseLabel')}</label>
                <select
                  value={formData.course_id}
                  onChange={(e) =>
                    setFormData({ ...formData, course_id: e.target.value ? Number(e.target.value) : '' })
                  }
                >
                  <option value="">{t('questions.modal.selectPlaceholder')}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('questions.modal.levelLabel')}</label>
                <select
                  value={formData.level_id}
                  onChange={(e) =>
                    setFormData({ ...formData, level_id: e.target.value ? Number(e.target.value) : '' })
                  }
                >
                  <option value="">{t('questions.modal.selectPlaceholder')}</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('questions.modal.branchLabel')}</label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData({ ...formData, branch_id: e.target.value ? Number(e.target.value) : '' })
                  }
                >
                  <option value="">{t('questions.modal.selectPlaceholder')}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t('questions.modal.questionsCountLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={formData.questions_count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      questions_count: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  placeholder={t('questions.modal.questionsCountPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('questions.modal.passPercentageLabel')}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.pass_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pass_percentage: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  placeholder={t('questions.modal.passPercentagePlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('questions.modal.timeLimitLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={formData.time_limit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      time_limit: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  placeholder={t('questions.modal.timeLimitPlaceholder')}
                />
              </div>

              <div className="form-group">
                <label>{t('questions.modal.statusLabel')}</label>
                <div className="toggle-buttons">
                  <button
                    type="button"
                    className={formData.status === 'inactive' ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, status: 'inactive' })}
                  >
                    {t('questions.statusInactive')}
                  </button>
                  <button
                    type="button"
                    className={formData.status === 'active' ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                  >
                    {t('questions.statusActive')}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="primary"
                onClick={handleSubmit}
                disabled={isPending || !formData.name.trim()}
              >
                {isPending ? t('questions.modal.saving') : t('questions.modal.save')}
              </button>
              <button
                className="cancel"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                {t('questions.modal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('questions.deleteModal.title')}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t('questions.deleteModal.confirm')}
              </button>
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('questions.deleteModal.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <Protected permission="questions.create">
          <button
            className="add-new-user"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            {t('questions.addBtn')}
          </button>
        </Protected>

        <Protected permission="questions.delete">
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={() => {
              setDeleteTarget('all');
              setShowDeleteModal(true);
            }}
          >
            {t('questions.deleteBtn')}
          </button>
        </Protected>

        <input
          placeholder={t('questions.search')}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="users-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th>{t('questions.table.name')}</th>
              <th>{t('questions.table.course')}</th>
              <th>{t('questions.table.level')}</th>
              <th>{t('questions.table.date')}</th>
              <th>{t('questions.table.timeLimit')}</th>
              <th>{t('questions.table.passPercentage')}</th>
              <th>{t('questions.table.questionsCount')}</th>
              <th>{t('questions.table.branch')}</th>
              <th>{t('questions.table.status')}</th>
              <th>{t('questions.table.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={12} />
            ) : filtered.length > 0 ? (
              filtered.map((item) => (
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
                  <td>
                    {item.course ? getLocalized(item.course, 'name', i18n.language) : '-'}
                  </td>
                  <td>
                    {item.level ? getLocalized(item.level, 'name', i18n.language) : '-'}
                  </td>
                  <td>{item.created_at?.slice(0, 10).replaceAll('-', '.') || '-'}</td>
                  <td>{item.time_limit ? `${item.time_limit} ${t('questions.timeLimitUnit')}` : '-'}</td>
                  <td>{item.pass_percentage != null ? `${item.pass_percentage}%` : '-'}</td>
                  <td>{item.questions_count ?? '-'}</td>
                  <td>
                    {item.branch ? getLocalized(item.branch, 'name', i18n.language) : '-'}
                  </td>
                  <td>
                    <span style={{ color: item.status === 'active' ? '#22a76f' : '#888', fontWeight: 600 }}>
                      {item.status === 'active' ? t('questions.statusActive') : t('questions.statusInactive')}
                    </span>
                  </td>
                  <td className="actions">
                    <Protected permission="questions.edit">
                      <button className="user-edit-btn" onClick={() => openEditModal(item)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Protected>
                    <Protected permission="questions.delete">
                      <button
                        className="user-delete-btn"
                        onClick={() => {
                          setDeleteTarget(item.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Protected>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={12} message={t('questions.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Questions;
