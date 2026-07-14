import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './users.css';
import { useTranslation } from 'react-i18next';
import type { User, UsersResponse } from '../../types';
import { useOptions } from '../../hooks/useOptions';

const genPassword = () =>
  Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

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

const UserForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [userImage, setUserImage] = useState<File | null>(null);

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

  const { data: apiData } = useQuery<UsersResponse>({
    queryKey: ['users'],
    enabled: isEditing,
    queryFn: async () => {
      const { data } = await API.get('/users');
      return data;
    },
  });

  const editingUser: User | undefined = isEditing
    ? apiData?.data?.find((u) => u.id === Number(id))
    : undefined;

  useEffect(() => {
    if (!editingUser) return;

    setFormData({
      familiya: editingUser.full_name.split(' ')[0] || '',
      ism: editingUser.full_name.split(' ')[1] || '',
      sharif: editingUser.full_name.split(' ')[2] || '',
      pinfl: editingUser.pinfl || '',
      phone: editingUser.phone,
      username: editingUser.username,
      password: '',
      start_date: editingUser.created_at.slice(0, 10),
      role_ids: editingUser.roles?.map((r) => r.id.toString()) || [],
      branch_ids:
        editingUser.branches && editingUser.branches.length > 0
          ? editingUser.branches.map((b) => b.id.toString())
          : editingUser.branch
            ? [editingUser.branch.id.toString()]
            : [],
      department_ids: editingUser.departments?.map((d) => d.id.toString()) || [],
      position_id: editingUser.position?.id?.toString() || '',
      is_active: editingUser.is_active,
      created_at_edit: editingUser.created_at?.slice(0, 10) || '',
      updated_at_edit: editingUser.updated_at?.slice(0, 10) || '',
    });
  }, [editingUser]);

  const { data: rolesData } = useOptions('roles');
  const { data: branchesData } = useOptions('branches');
  const { data: departmentsData } = useOptions('departments');

  const roles = rolesData || [];
  const branches = branchesData || [];
  const departments = departmentsData || [];

  const addRole = (roleId: string) => {
    if (roleId && !formData.role_ids.includes(roleId)) {
      setFormData({ ...formData, role_ids: [...formData.role_ids, roleId] });
    }
  };

  const removeRole = (roleId: string) => {
    setFormData({
      ...formData,
      role_ids: formData.role_ids.filter((rid) => rid !== roleId),
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
      branch_ids: formData.branch_ids.filter((bid) => bid !== branchId),
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
      department_ids: formData.department_ids.filter((did) => did !== deptId),
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
      setUserImage(null);
      navigate('/users');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id: userId, updates }: { id: number; updates: UpdateUserPayload }) => {
      const { data } = await API.put(`/users/${userId}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/users');
    },
  });

  const handleSubmit = () => {
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

  return (
    <section className="usrf-page">
      <div className="usrf-card">
        <h1 className="usrf-heading">
          {isEditing ? t('users.userEditTitle') : t('users.addNewUserTitle')}
        </h1>

        <div className="usrf-body">
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
                        {r?.label || roleId}
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
                      {r.label}
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
                        {branch?.label ?? branchId}
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
                      {branch.label}
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
                        {dept?.label ?? deptId}
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
                      {dept.label}
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
        </div>

        <div className="usrf-footer">
          <button
            className="primary"
            onClick={handleSubmit}
            disabled={
              createMutation.isPending || updateMutation.isPending || formData.pinfl.length !== 14
            }
          >
            {createMutation.isPending || updateMutation.isPending
              ? t('users.saving')
              : t('users.save')}
          </button>

          <button className="cancel" onClick={() => navigate('/users')}>
            {t('users.cancel')}
          </button>
        </div>
      </div>
    </section>
  );
};

export default UserForm;
