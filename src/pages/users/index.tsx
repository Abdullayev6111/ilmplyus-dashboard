import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { API } from '../../api/api';
import './users.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import WorkScheduleModal from '../../components/WorkScheduleModal';
import type { User, UsersResponse, Branch, Role } from '../../types';
import type { DepartmentType } from '../../types/department.types';
import { useTableSettingsStore } from '../../store/useTableSettingsStore';
import { Protected } from '../../components/Protected';

const genPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

const Users = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [workTimeId, setWorkTimeId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [userImage, setUserImage] = useState<File | null>(null);

  const { settings, getColumnOrder } = useTableSettingsStore();
  const userSettings = settings.users || {};
  const isVisible = (colId: string) => userSettings[colId] ?? true;

  const defaultDraggableColumns = [
    'full_name',
    'phone',
    'role',
    'status',
    'branch',
    'username',
    'pinfl',
    'department',
    'created_at',
    'updated_at',
  ];

  const getOrderedColumns = () => {
    return getColumnOrder('users', defaultDraggableColumns);
  };

  const getColumnHeader = (colId: string): string => {
    const headerMap: Record<string, string> = {
      full_name: t('users.fish'),
      phone: t('users.phone'),
      role: t('users.role'),
      status: t('users.status'),
      branch: t('users.branch'),
      username: t('users.loginText'),
      pinfl: t('users.pinfl'),
      department: t('users.department'),
      created_at: t('users.createdAt'),
      updated_at: t('users.updatedAt'),
    };
    return headerMap[colId] || colId;
  };

  const renderCellValue = (u: User, colId: string) => {
    switch (colId) {
      case 'full_name':
        return u.full_name;
      case 'phone':
        return u.phone;
      case 'role':
        return u.roles?.map((r) => r.name).join(', ') || '-';
      case 'status':
        return u.is_active ? t('users.active') : t('users.inactive');
      case 'branch':
        return u.branches && u.branches.length > 0
          ? u.branches.map((b) => getLocalized(b, 'name', i18n.language)).join(', ')
          : u.branch
            ? getLocalized(u.branch, 'name', i18n.language)
            : '-';
      case 'username':
        return u.username;
      case 'pinfl':
        return u.pinfl || '-';
      case 'department':
        return u.departments && u.departments.length > 0
          ? u.departments.map((d) => getLocalized(d, 'name', i18n.language)).join(', ')
          : '-';
      case 'created_at':
        return u.created_at?.slice(0, 10).replaceAll('-', '.') || '-';
      case 'updated_at':
        return u.updated_at?.slice(0, 10).replaceAll('-', '.') || '-';
      default:
        return '-';
    }
  };

  const { data: apiData, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await API.get('/users');
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const [formData, setFormData] = useState({
    familiya: '',
    ism: '',
    sharif: '',
    pinfl: '',
    phone: '',
    username: '',
    password: genPassword(),
    start_date: '',
    role_ids: [] as string[],
    branch_ids: [] as string[],
    department_ids: [] as string[],
    position_id: '',
    is_active: true,
    created_at_edit: '',
    updated_at_edit: '',
  });

  const addRole = (roleId: string) => {
    if (roleId && !formData.role_ids.includes(roleId)) {
      setFormData({ ...formData, role_ids: [...formData.role_ids, roleId] });
    }
  };

  const removeRole = (roleId: string) => {
    setFormData({
      ...formData,
      role_ids: formData.role_ids.filter((id) => id !== roleId),
    });
  };

  const addBranch = (branchId: string) => {
    if (branchId && !formData.branch_ids.includes(branchId)) {
      setFormData({
        ...formData,
        branch_ids: [...formData.branch_ids, branchId],
      });
    }
  };

  const removeBranch = (branchId: string) => {
    setFormData({
      ...formData,
      branch_ids: formData.branch_ids.filter((id) => id !== branchId),
    });
  };

  const addDepartment = (deptId: string) => {
    if (deptId && !formData.department_ids.includes(deptId)) {
      setFormData({ ...formData, department_ids: [...formData.department_ids, deptId] });
    }
  };

  const removeDepartment = (deptId: string) => {
    setFormData({
      ...formData,
      department_ids: formData.department_ids.filter((id) => id !== deptId),
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        full_name: `${formData.familiya} ${formData.ism} ${formData.sharif}`.trim(),
        username: formData.username,
        pinfl: formData.pinfl,
        phone: formData.phone,
        password: formData.password,
        position_id: formData.position_id ? Number(formData.position_id) : undefined,
        branch_ids: formData.branch_ids.map(Number),
        department_ids: formData.department_ids.map(Number),
        roles: formData.role_ids.map(Number),
        is_active: formData.is_active,
      };

      if (userImage) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v === undefined) return;
          if (Array.isArray(v)) {
            v.forEach((item) => fd.append(`${k}[]`, String(item)));
          } else {
            fd.append(k, String(v));
          }
        });
        fd.append('image', userImage);
        const res = await API.post('/users', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      }

      const res = await API.post('/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddModal(false);
      setUserImage(null);
      resetForm();
    },
  });

  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  // const { data: positionsData } = useQuery<Position[]>({
  //   queryKey: ['positions'],
  //   queryFn: async () => {
  //     const { data } = await API.get('/positions');
  //     return Array.isArray(data) ? data : data?.data || [];
  //   },
  // });

  const { data: rolesData } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await API.get('/roles');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const { data: departmentsData } = useQuery<DepartmentType[]>({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await API.get('/departments');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const roles = rolesData || [];
  const branches = branchesData || [];
  const departments = departmentsData || [];

  const handleSubmit = () => {
    createMutation.mutate();
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      familiya: user.full_name.split(' ')[0] || '',
      ism: user.full_name.split(' ')[1] || '',
      sharif: user.full_name.split(' ')[2] || '',
      pinfl: user.pinfl || '',
      phone: user.phone,
      username: user.username,
      password: '',
      start_date: user.created_at.slice(0, 10),
      role_ids: user.roles?.map((r) => r.id.toString()),
      branch_ids:
        user.branches && user.branches.length > 0
          ? user.branches.map((b) => b.id.toString())
          : user.branch
            ? [user.branch.id.toString()]
            : [],
      department_ids: user.departments?.map((d) => d.id.toString()) || [],
      position_id: user.position?.id?.toString() || '',
      is_active: user.is_active,
      created_at_edit: user.created_at?.slice(0, 10) || '',
      updated_at_edit: user.updated_at?.slice(0, 10) || '',
    });
    setShowAddModal(true);
  };

  interface UpdateUserPayload {
    full_name?: string;
    username?: string;
    pinfl?: string;
    phone?: string;
    password?: string;
    roles?: number[];
    branch_ids?: number[];
    department_ids?: number[];
    position_id?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  }

  const handleEditSubmit = () => {
    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        updates: {
          full_name: `${formData.familiya} ${formData.ism} ${formData.sharif}`.trim(),
          username: formData.username,
          pinfl: formData.pinfl,
          phone: formData.phone,
          roles: formData.role_ids.map(Number),
          branch_ids: formData.branch_ids.map(Number),
          department_ids: formData.department_ids.map(Number),
          position_id: formData.position_id ? Number(formData.position_id) : undefined,
          is_active: formData.is_active,
          password: formData.password || undefined,
          created_at: formData.created_at_edit
            ? `${formData.created_at_edit} ${new Date().toTimeString().slice(0, 8)}`
            : undefined,
          updated_at: formData.updated_at_edit
            ? `${formData.updated_at_edit} ${new Date().toTimeString().slice(0, 8)}`
            : undefined,
        },
      });
    } else {
      createMutation.mutate();
    }
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: UpdateUserPayload }) => {
      const { data } = await API.put(`/users/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAddModal(false);
      setEditingUser(null);
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      familiya: '',
      ism: '',
      sharif: '',
      pinfl: '',
      phone: '',
      username: '',
      password: genPassword(),
      start_date: '',
      role_ids: [],
      branch_ids: [],
      department_ids: [],
      position_id: '',
      is_active: true,
      created_at_edit: '',
      updated_at_edit: '',
    });
    setEditingUser(null);
    setUserImage(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const filtered = useMemo(() => {
    const users = apiData?.data || [];

    return users
      .filter((u) => {
        const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase());
        const matchRole = role ? u.roles?.some((r) => r.name === role) : true;

        if (!matchSearch || !matchRole) return false;

        return true;
      })
      .sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
  }, [apiData?.data, search, role, sortAsc]);

  const toggleAll = (checked: boolean) => setSelected(checked ? filtered?.map((u) => u.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

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

  return (
    <section className="users container">
      <h1 className="main-title">{t('users.listTitle')}</h1>
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal add-user-modal">
            <h3 className="modal-title">
              {editingUser ? t('users.userEditTitle') : t('users.addNewUserTitle')}
            </h3>

            <div className="add-user-form">
              <div className="form-left">
                <div className="form-group">
                  <label>{t('users.lastName')}</label>
                  <input
                    type="text"
                    value={formData.familiya}
                    onChange={(e) => setFormData({ ...formData, familiya: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.firstName')}</label>
                  <input
                    type="text"
                    value={formData.ism}
                    onChange={(e) => setFormData({ ...formData, ism: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.familyName')}</label>
                  <input
                    type="text"
                    value={formData.sharif}
                    onChange={(e) => setFormData({ ...formData, sharif: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.pinfl')}</label>
                  <input
                    type="text"
                    value={formData.pinfl}
                    maxLength={14}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 14);
                      setFormData({ ...formData, pinfl: val });
                    }}
                  />
                  {formData.pinfl.length > 0 && formData.pinfl.length !== 14 && (
                    <span
                      className="error-text"
                      style={{
                        color: 'red',
                        fontSize: '12px',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      {t('users.pinflError')}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>{t('users.phoneNumber')}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.loginText')}</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.password')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t('users.passwordPlaceholder')}
                    />
                    <button
                      className="refresh-password"
                      type="button"
                      title={t('users.generatePasswordTooltip')}
                      onClick={() => {
                        const newPass = genPassword();
                        setFormData({ ...formData, password: newPass });
                      }}
                    >
                      🔄
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('users.startDate')}</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                {editingUser && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>{t('users.createdAt')}</label>
                      <input
                        type="date"
                        value={formData.created_at_edit}
                        onChange={(e) =>
                          setFormData({ ...formData, created_at_edit: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>{t('users.updatedAt')}</label>
                      <input
                        type="date"
                        value={formData.updated_at_edit}
                        onChange={(e) =>
                          setFormData({ ...formData, updated_at_edit: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-right">
                <div className="form-group">
                  <label>{t('users.roles')}</label>
                  <div className="selected-items-box">
                    {formData.role_ids?.map((roleId) => {
                      const r = roles.find((r) => r.id.toString() === roleId);
                      return (
                        <div key={roleId} className="selected-item">
                          {r?.name || roleId}
                          <button onClick={() => removeRole(roleId)}>×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <select
                    onChange={(e) => {
                      addRole(e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">{t('users.choose')}</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('users.branches')}</label>
                  <div className="selected-items-box">
                    {formData.branch_ids?.map((branchId) => {
                      const branch = branches.find((b) => b.id.toString() === branchId);
                      return (
                        <div key={branchId} className="selected-item">
                          {branch ? getLocalized(branch, 'name', i18n.language) : branchId}
                          <button type="button" onClick={() => removeBranch(branchId)}>
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <select
                    onChange={(e) => {
                      addBranch(e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">{t('users.choose')}</option>
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {getLocalized(branch, 'name', i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('users.departments')}</label>
                  <div className="selected-items-box">
                    {formData.department_ids?.map((deptId) => {
                      const dept = departments.find((d) => d.id.toString() === deptId);
                      return (
                        <div key={deptId} className="selected-item">
                          {dept ? getLocalized(dept, 'name', i18n.language) : deptId}
                          <button type="button" onClick={() => removeDepartment(deptId)}>
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <select
                    onChange={(e) => {
                      addDepartment(e.target.value);
                      e.target.value = '';
                    }}
                  >
                    <option value="">{t('users.choose')}</option>
                    {departments?.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {getLocalized(dept, 'name', i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('users.endDate')}</label>
                  <input type="date" />
                </div>

                <div className="form-group">
                  <div className="toggle-buttons">
                    <button
                      type="button"
                      className={formData.is_active ? '' : 'active'}
                      onClick={() => setFormData({ ...formData, is_active: false })}
                    >
                      {t('users.inactive')}
                    </button>
                    <button
                      type="button"
                      className={formData.is_active ? 'active' : ''}
                      onClick={() => setFormData({ ...formData, is_active: true })}
                    >
                      {t('users.active')}
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-actions">
              <button
                className="primary"
                onClick={editingUser ? handleEditSubmit : handleSubmit}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  formData.pinfl.length !== 14
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('users.saving')
                  : t('users.save')}
              </button>

              <button
                className="cancel"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
              >
                {t('users.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('users.confirmDelete')}</h3>

            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>
                {t('users.confirm')}
              </button>

              <button className="cancel" onClick={() => setShowDeleteModal(false)}>
                {t('users.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {workTimeId !== null && (
        <WorkScheduleModal userId={workTimeId} onClose={() => setWorkTimeId(null)} />
      )}

      <div className="users-filters">
        <Protected permission="users.create">
          <button className="add-new-user" onClick={() => setShowAddModal(true)}>
            {t('users.addNew')}
          </button>
        </Protected>

        <Protected permission="users.delete">
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={() => {
              setDeleteTarget('all');
              setShowDeleteModal(true);
            }}
          >
            {t('users.delete')}
          </button>
        </Protected>

        <select onChange={(e) => setRole(e.target.value)}>
          <option value="">{t('users.employeeType')}</option>
          {roles?.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>

        <input placeholder={t('users.search')} onChange={(e) => setSearch(e.target.value)} />
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
              {isVisible('id') && <th className="th-sortable" onClick={() => setSortAsc(p => !p)}>ID {sortAsc ? '↑' : '↓'}</th>}
              {getOrderedColumns().map((colId) => {
                if (!isVisible(colId)) return null;
                return <th key={colId}>{getColumnHeader(colId)}</th>;
              })}
              <th>{t('users.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={10} />
            ) : filtered.length > 0 ? (
              filtered?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={() => toggleOne(u.id)}
                    />
                  </td>

                  {isVisible('id') && <td>{u.id}</td>}

                  {getOrderedColumns().map((colId) => {
                    if (!isVisible(colId)) return null;
                    return <td key={colId}>{renderCellValue(u, colId)}</td>;
                  })}

                  <td className="actions">
                    <div style={{ position: 'relative' }}>
                      <button className="user-workTime-btn" onClick={() => setWorkTimeId(u.id)}>
                        <i className="fa-solid fa-clock"></i>
                      </button>
                    </div>

                    <Protected permission="users.edit">
                      <button className="user-edit-btn" onClick={() => openEditModal(u)}>
                        <i className="fa-solid fa-pen"></i>
                      </button>
                    </Protected>

                    <Protected permission="users.delete">
                      <button
                        className="user-delete-btn"
                        onClick={() => {
                          setDeleteTarget(u.id);
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
              <EmptyState colSpan={13} message={t('users.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Users;
