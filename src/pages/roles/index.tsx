import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './roles.css';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import type { Role } from '../../types/common.types';

const Roles = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [sortAsc, setSortAsc] = useState(true);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await API.get('/roles');
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });

  const toggleAll = (checked: boolean) => setSelected(checked ? roles?.map((r) => r.id) || [] : []);

  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleBatchDelete = () => {
    if (
      window.confirm(
        t('roles.confirmBatchDelete', "Tanlanganlarni haqiqatan ham o'chirmoqchimisiz?"),
      )
    ) {
      selected.forEach((id) => deleteRoleMutation.mutate(id));
      setSelected([]);
    }
  };

  return (
    <section className="role-container container">
      <h1 className="role-page-title">{t('roles.listTitle', "Amallar ro'yxati")}</h1>

      <div className="role-header-actions">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="role-add-btn" onClick={() => navigate('/roles/create')}>
            {t('roles.add')}
          </button>

          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={handleBatchDelete}
            style={{ width: 'auto', padding: '0 15px', borderRadius: '10px' }}
          >
            {t('roles.delete')}
          </button>
        </div>
      </div>

      <div className="role-table-container">
        <table className="role-data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length > 0 && selected.length === roles?.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th>{t('roles.name')}</th>
              <th>{t('roles.harakatlar')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={5} columnCount={4} />
            ) : roles && roles.length > 0 ? (
              [...(roles || [])]
                .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id))
                .map((role) => (
                  <tr key={role.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(role.id)}
                        onChange={() => toggleOne(role.id)}
                      />
                    </td>
                    <td>{role.id}</td>
                    <td>{role.name}</td>
                    <td className="role-action-cell">
                      <button
                        className="role-edit-icon"
                        onClick={() => navigate(`/roles/${role.id}/permissions`)}
                        title={t('roles.edit', 'Tahrirlash')}
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        className="role-delete-icon"
                        onClick={() => {
                          if (window.confirm(t('roles.confirmDelete'))) {
                            deleteRoleMutation.mutate(role.id);
                          }
                        }}
                        title={t('roles.delete')}
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                      <button
                        className="role-permission-icon"
                        onClick={() => navigate(`/roles/${role.id}/permissions`)}
                        title={t('roles.assignPermissions')}
                      >
                        <i className="fa-solid fa-shield-halved"></i>
                      </button>
                    </td>
                  </tr>
                ))
            ) : (
              <EmptyState colSpan={5} message={t('roles.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Roles;
