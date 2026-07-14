import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { API } from '../../api/api';
import './users.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import WorkScheduleModal from '../../components/WorkScheduleModal';
import type { User, UsersResponse } from '../../types';
import { useTableSettingsStore } from '../../store/useTableSettingsStore';
import { Protected } from '../../components/Protected';
import { useOptions } from '../../hooks/useOptions';

const Users = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [workTimeId, setWorkTimeId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

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

  const { data: rolesData } = useOptions('roles');

  const roles = rolesData || [];

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
          <button className="add-new-user" onClick={() => navigate('/users/add')}>
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
            <option key={r.id} value={r.label}>
              {r.label}
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
                      <button className="user-edit-btn" onClick={() => navigate(`/users/${u.id}/edit`)}>
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
