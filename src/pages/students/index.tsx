import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  studentAPI,
  type Student,
  type StudentPayload,
  type StudentGroup,
  type PaginatedStudents,
} from '../../api/student.api';
import { API } from '../../api/api';
import '../users/users.css';
import '../expenses/expenses.css';
import './students.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';

interface BranchItem {
  id: number;
  name: string;
  name_uz?: string;
}
interface CourseItem {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}
interface LevelItem {
  id: number;
  name_uz: string;
  name_ru?: string;
  name_en?: string;
}
interface ContractItem {
  employee_id: number;
  employee: { id: number; full_name: string };
}
interface RoomItem {
  id: number;
  name: string;
}

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

const formatDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fetchList = async <T,>(endpoint: string): Promise<T[]> => {
  const { data } = await API.get(endpoint);
  return Array.isArray(data) ? data : (data?.data ?? []);
};

const STUDENTS_PAGE_SIZES = [10, 20, 50, 100];

interface StudentsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const StudentsPagination = ({ currentPage, totalPages, onPageChange }: StudentsPaginationProps) => {
  const pages = useMemo((): (number | '...')[] => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages];
    if (currentPage >= totalPages - 2)
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="students-pagination__pages">
      <button
        type="button"
        className="students-pagination__btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="students-pagination__ellipsis">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={`students-pagination__btn${currentPage === page ? ' students-pagination__btn--active' : ''}`}
            onClick={() => onPageChange(page as number)}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        className="students-pagination__btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
};

const Students = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [viewingItem, setViewingItem] = useState<Student | null>(null);
  const [editingItem, setEditingItem] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentPayload>({
    full_name: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery<PaginatedStudents>({
    queryKey: ['students', currentPage, pageSize],
    queryFn: () => studentAPI.getAll({ page: currentPage, per_page: pageSize }),
    placeholderData: (prev) => prev,
  });

  const students = data?.data;
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.last_page ?? 1;
  const fromItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toItem = Math.min(currentPage * pageSize, total);

  const { data: branches = [] } = useQuery<BranchItem[]>({
    queryKey: ['branches-lookup'],
    queryFn: () => fetchList<BranchItem>('/branches'),
  });

  const { data: courses = [] } = useQuery<CourseItem[]>({
    queryKey: ['courses-lookup'],
    queryFn: () => fetchList<CourseItem>('/courses'),
  });

  const { data: levels = [] } = useQuery<LevelItem[]>({
    queryKey: ['levels-lookup'],
    queryFn: () => fetchList<LevelItem>('/levels'),
  });

  const { data: contracts = [] } = useQuery<ContractItem[]>({
    queryKey: ['contracts-lookup'],
    queryFn: () => fetchList<ContractItem>('/contracts'),
  });

  const { data: rooms = [] } = useQuery<RoomItem[]>({
    queryKey: ['rooms-lookup'],
    queryFn: () => fetchList<RoomItem>('/rooms'),
  });

  const getBranchName = (id: number) => {
    const b = branches.find((x) => x.id === id);
    return b ? b.name || b.name_uz || String(id) : String(id);
  };
  const getCourseName = (id: number) => {
    const c = courses.find((x) => x.id === id);
    return c ? getLocalized(c, 'name', i18n.language) : String(id);
  };
  const getLevelName = (id: number) => {
    const l = levels.find((x) => x.id === id);
    return l ? getLocalized(l, 'name', i18n.language) : String(id);
  };
  const getTeacherName = (id: number) => {
    const c = contracts.find((x) => x.employee_id === id);
    return c ? c.employee.full_name : String(id);
  };
  const getRoomName = (id: number) => {
    const r = rooms.find((x) => x.id === id);
    return r ? r.name : String(id);
  };

  const sorted = useMemo(() => (students || []).slice().sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id), [students, sortAsc]);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: StudentPayload }) =>
      studentAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      resetEditForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentAPI.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const openViewModal = (item: Student) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const toDateInput = (val: string | null | undefined) => {
    if (!val) return '';
    return val.slice(0, 10);
  };

  const openEditModal = (item: Student) => {
    setEditingItem(item);
    setFormData({
      full_name: item.full_name,
      username: item.username,
      password: '',
      birth_date: toDateInput(item.birth_date),
      phone: item.phone || '',
      branch_id: item.branch_id,
      gender: item.gender || '',
      father_name: item.father_name || '',
      is_active: item.is_active,
      is_contract_confirmed: item.is_contract_confirmed,
    });
    setShowEditModal(true);
  };

  const confirmDelete = () => {
    const removingCount = deleteTarget === 'all' ? selected.length : 1;
    // Sahifadagi oxirgi yozuvlar o'chirilsa, bo'sh sahifada qolib ketmaslik uchun orqaga qaytamiz.
    const pageBecomesEmpty = (students?.length ?? 0) - removingCount <= 0 && currentPage > 1;

    if (deleteTarget === 'all') {
      selected.forEach((id) => deleteMutation.mutate(id));
      setSelected([]);
    } else if (typeof deleteTarget === 'number') {
      deleteMutation.mutate(deleteTarget);
      setSelected((p) => p.filter((x) => x !== deleteTarget));
    }

    if (pageBecomesEmpty) setCurrentPage((p) => p - 1);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelected([]);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setSelected([]);
  };

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? students?.map((s) => s.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const resetEditForm = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setFormData({ full_name: '', username: '', password: '' });
  };

  const renderGroupCard = (group: StudentGroup, idx: number) => (
    <div className="group-card" key={group.id}>
      <div className="group-card-header">
        {idx + 1}. {group.name}
      </div>
      <div className="group-info-grid">
        <div className="group-info-item">
          <label>{t('students.branch')}</label>
          <span>{getBranchName(group.branch_id)}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.course')}</label>
          <span>{getCourseName(group.course_id)}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.level')}</label>
          <span>{getLevelName(group.level_id)}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.teacher')}</label>
          <span>{getTeacherName(group.teacher_id)}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.room')}</label>
          <span>{getRoomName(group.room_id)}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.maxStudents')}</label>
          <span>{group.max_students}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.startDate')}</label>
          <span>{group.start_date ? formatDate(group.start_date) : '-'}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.endDate')}</label>
          <span>{group.end_date ? formatDate(group.end_date) : '-'}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.duration')}</label>
          <span>
            {group.duration} {t('students.min')}
          </span>
        </div>
        <div className="group-info-item">
          <label>{t('students.startTime')}</label>
          <span>{group.start_time ?? '-'}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.endTime')}</label>
          <span>{group.end_time ?? '-'}</span>
        </div>
        <div className="group-info-item">
          <label>{t('students.status')}</label>
          <span>
            {group.is_active ? (
              <span className="status-badge active">{t('students.active')}</span>
            ) : (
              <span className="status-badge inactive">{t('students.inactive')}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="users container">
      <h1 className="main-title">{t('students.title')}</h1>

      {/* View Modal */}
      {showViewModal && viewingItem && (
        <div className="modal-overlay">
          <div className="student-view-modal">
            <h2 className="student-view-title">{viewingItem.full_name}</h2>

            <div className="student-section-title">{t('students.personalInfo')}</div>
            <div className="student-info-grid">
              <div className="student-info-item">
                <label>{t('students.name')}</label>
                <span>{viewingItem.full_name}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.studentCode')}</label>
                <span>{viewingItem.student_code}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.birthDate')}</label>
                <span>{viewingItem.birth_date ? formatDate(viewingItem.birth_date) : '-'}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.phone')}</label>
                <span>{viewingItem.phone || '-'}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.login')}</label>
                <span>{viewingItem.username}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.balance')}</label>
                <span>{viewingItem.balance}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.lidId')}</label>
                <span>{viewingItem.lid_id ?? '-'}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.status')}</label>
                <span>
                  {viewingItem.is_active ? (
                    <span className="status-badge active">{t('students.active')}</span>
                  ) : (
                    <span className="status-badge inactive">{t('students.inactive')}</span>
                  )}
                </span>
              </div>
              <div className="student-info-item">
                <label>{t('students.contract')}</label>
                <span>
                  {viewingItem.is_contract_confirmed ? (
                    <span className="status-badge active">{t('students.confirmed')}</span>
                  ) : (
                    <span className="status-badge inactive">{t('students.notConfirmed')}</span>
                  )}
                </span>
              </div>
              <div className="student-info-item">
                <label>{t('students.createdAt')}</label>
                <span>{formatDateTime(viewingItem.created_at)}</span>
              </div>
              <div className="student-info-item">
                <label>{t('students.updatedAt')}</label>
                <span>{formatDateTime(viewingItem.updated_at)}</span>
              </div>
            </div>

            <div className="student-section-title">{t('students.groups')}</div>
            {viewingItem.groups && viewingItem.groups.length > 0 ? (
              viewingItem.groups.map((g, i) => renderGroupCard(g, i))
            ) : (
              <p style={{ color: '#999', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>
                {t('students.noGroups')}
              </p>
            )}

            <div className="student-view-close">
              <button onClick={() => setShowViewModal(false)}>{t('students.close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="modal-overlay">
          <div className="student-edit-modal">
            <h1>{t('students.editTitle')}</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const payload = { ...formData };
                if (!payload.password) delete payload.password;
                updateMutation.mutate({ id: editingItem.id, payload });
              }}
            >
              <div className="student-edit-grid">
                <div className="student-edit-group">
                  <label>{t('students.name')}</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="student-edit-group">
                  <label>{t('students.login')}</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="student-edit-group">
                  <label>{t('students.birthDate')}</label>
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
                </div>

                <div className="student-edit-group">
                  <label>{t('students.phone')}</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="student-edit-group">
                  <label>{t('students.fatherName')}</label>
                  <input
                    type="text"
                    value={formData.father_name || ''}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  />
                </div>

                <div className="student-edit-group">
                  <label>{t('students.gender')}</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">{t('students.selectGender')}</option>
                    <option value="male">{t('students.male')}</option>
                    <option value="female">{t('students.female')}</option>
                  </select>
                </div>

                <div className="student-edit-group">
                  <label>{t('students.branch')}</label>
                  <select
                    value={formData.branch_id ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, branch_id: Number(e.target.value) || undefined })
                    }
                  >
                    <option value="">{t('students.selectBranch')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name || b.name_uz}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="student-edit-group">
                  <label>{t('students.status')}</label>
                  <select
                    value={formData.is_active === undefined ? '' : String(formData.is_active)}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.value === 'true' })
                    }
                  >
                    <option value="">{t('students.selectStatus')}</option>
                    <option value="true">{t('students.active')}</option>
                    <option value="false">{t('students.inactive')}</option>
                  </select>
                </div>

                <div className="student-edit-group">
                  <label>{t('students.contract')}</label>
                  <select
                    value={
                      formData.is_contract_confirmed === undefined
                        ? ''
                        : String(formData.is_contract_confirmed)
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, is_contract_confirmed: e.target.value === 'true' })
                    }
                  >
                    <option value="">{t('students.selectContract')}</option>
                    <option value="true">{t('students.confirmed')}</option>
                    <option value="false">{t('students.notConfirmed')}</option>
                  </select>
                </div>

                <div className="student-edit-group">
                  <label>{t('students.newPassword')}</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t('students.passwordPlaceholder')}
                    />
                    <button
                      type="button"
                      className="password-eye-btn"
                      onClick={() => setShowPassword((p) => !p)}
                    >
                      <i className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
                    </button>
                  </div>
                  <span className="password-hint">{t('students.passwordHint')}</span>
                </div>
              </div>

              <div className="student-edit-actions">
                <button className="primary" type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? t('students.saving') : t('students.save')}
                </button>
                <button type="button" className="cancel" onClick={resetEditForm}>
                  {t('students.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('students.confirmDelete')}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t('students.delete')}
              </button>
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('students.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="users-filters">
        <Protected permission="students.delete">
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={() => {
              setDeleteTarget('all');
              setShowDeleteModal(true);
            }}
          >
            {t('students.delete')}
          </button>
        </Protected>

        <div className="students-pagesize">
          <label htmlFor="students-pagesize-select">{t('students.rowsLabel')}</label>
          <select
            id="students-pagesize-select"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            {STUDENTS_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selected.length === (students?.length || 0) && (students?.length || 0) > 0
                  }
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc(p => !p)}>ID {sortAsc ? '↑' : '↓'}</th>
              <th>{t('students.name')}</th>
              <th>{t('students.birthDate')}</th>
              <th>{t('students.login')}</th>
              <th>{t('students.branch')}</th>
              <th>{t('students.groups')}</th>
              <th>{t('students.contract')}</th>
              <th>{t('students.createdAt')}</th>
              <th>{t('students.updatedAt')}</th>
              <th>{t('students.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={11} />
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
                  <td>{item.full_name}</td>
                  <td>{item.birth_date ? formatDate(item.birth_date) : '-'}</td>
                  <td>{item.username}</td>
                  <td>{getBranchName(item.branch_id)}</td>
                  <td>
                    {item.groups && item.groups.length > 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          justifyContent: 'center',
                        }}
                      >
                        {item.groups.map((g) => (
                          <span key={g.id} className="groups-tag">
                            {g.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {item.is_contract_confirmed ? (
                      <i className="fa-solid fa-circle-check contract-yes"></i>
                    ) : (
                      <i className="fa-solid fa-circle-xmark contract-no"></i>
                    )}
                  </td>
                  <td>{formatDateTime(item.created_at)}</td>
                  <td>{formatDateTime(item.updated_at)}</td>
                  <td className="actions">
                    <button className="user-view-btn" onClick={() => openViewModal(item)}>
                      <i className="fa-solid fa-eye"></i>
                    </button>
                    <Protected permission="students.edit">
                      <button className="user-edit-btn" onClick={() => openEditModal(item)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    </Protected>
                    <Protected permission="students.delete">
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
              <EmptyState colSpan={11} message={t('students.notFound')} />
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && total > 0 && (
        <div className="students-pagination">
          <span className="students-pagination__info">
            {t('students.paginationInfo', { total, from: fromItem, to: toItem })}
          </span>
          {totalPages > 1 && (
            <StudentsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </section>
  );
};

export default Students;
