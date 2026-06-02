import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../api/api';
import { useTranslation } from 'react-i18next';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';
import '../pages/users/users.css';

export interface ArchiveColumn {
  key: string;
  label: string;
  render?: (item: Record<string, unknown>) => React.ReactNode;
}

interface Props {
  endpoint: string;
  title: string;
  columns: ArchiveColumn[];
  queryKey: string;
}

const ArchivePage = ({ endpoint, title, columns, queryKey }: Props) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [forceTarget, setForceTarget] = useState<number | null>(null);

  const { data, isLoading } = useQuery<Record<string, unknown>[]>({
    queryKey: [queryKey, 'archive'],
    queryFn: async () => {
      const { data } = await API.get(`/${endpoint}?only_trashed=1`);
      return Array.isArray(data) ? data : (data as Record<string, unknown>)?.data || [];
    },
  });

  const items = (data || []) as (Record<string, unknown> & { id: number })[];

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.post(`/${endpoint}/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, 'archive'] });
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const forceDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/${endpoint}/${id}/force`);
    },
    onSuccess: () => {
      setShowConfirm(false);
      setForceTarget(null);
      queryClient.invalidateQueries({ queryKey: [queryKey, 'archive'] });
    },
  });

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? items.map((i) => i.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const restoreSelected = () => {
    selected.forEach((id) => restoreMutation.mutate(id));
    setSelected([]);
  };

  const getCellValue = (item: Record<string, unknown>, col: ArchiveColumn): React.ReactNode => {
    if (col.render) return col.render(item);
    const val = item[col.key];
    if (val === null || val === undefined) return '-';
    return String(val);
  };

  return (
    <section className="users container">
      <h1 className="main-title">{title}</h1>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('archive.confirmForceDelete')}</h3>
            <div className="modal-actions">
              <button
                className="danger"
                onClick={() => forceTarget !== null && forceDeleteMutation.mutate(forceTarget)}
                disabled={forceDeleteMutation.isPending}
              >
                {t('archive.confirm')}
              </button>
              <button
                className="cancel"
                onClick={() => {
                  setShowConfirm(false);
                  setForceTarget(null);
                }}
              >
                {t('archive.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters">
        <button
          className="archive-restore-all-btn"
          disabled={!selected.length}
          onClick={restoreSelected}
        >
          <i className="fa-solid fa-rotate-left" />
          {t('archive.restoreSelected')}
        </button>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === items.length && items.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th>ID</th>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th>{t('archive.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={6} columnCount={columns.length + 3} />
            ) : items.length === 0 ? (
              <EmptyState colSpan={columns.length + 3} message={t('archive.noData')} />
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  {columns.map((col) => (
                    <td key={col.key}>{getCellValue(item, col)}</td>
                  ))}
                  <td className="actions">
                    <button
                      className="archive-restore-btn"
                      onClick={() => restoreMutation.mutate(item.id)}
                      title={t('archive.restore')}
                      disabled={restoreMutation.isPending}
                    >
                      <i className="fa-solid fa-rotate-left" />
                    </button>
                    <button
                      className="user-delete-btn"
                      onClick={() => {
                        setForceTarget(item.id);
                        setShowConfirm(true);
                      }}
                      title={t('archive.forceDelete')}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ArchivePage;
