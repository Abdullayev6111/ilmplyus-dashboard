import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import { useTranslation } from 'react-i18next';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import '../users/users.css';

type TrashItem = Record<string, unknown> & { id: number };
type TrashData = Record<string, TrashItem[]>;

const getDisplayName = (type: string, item: TrashItem): string => {
  if (type === 'lids') {
    const first = item.first_name ?? '';
    const last = item.last_name ?? '';
    return `${last} ${first}`.trim() || '-';
  }
  if (type === 'student_contracts' || type === 'employee_contracts') {
    return String(item.contract_number ?? '-');
  }
  if (typeof item.full_name === 'string') return item.full_name;
  if (typeof item.name === 'string') return item.name;
  if (typeof item.name_uz === 'string') return item.name_uz;
  if (typeof item.name_ru === 'string') return item.name_ru;
  if (typeof item.name_en === 'string') return item.name_en;
  if (typeof item.title === 'string') return item.title;
  if (item.date) return String(item.date).slice(0, 10);
  return String(item.id);
};

const formatDate = (val: unknown) =>
  val ? String(val).slice(0, 10).replaceAll('-', '.') : '-';

const TrashPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('');
  const [confirmItem, setConfirmItem] = useState<{ type: string; id: number } | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const { data, isLoading } = useQuery<TrashData>({
    queryKey: ['trash'],
    queryFn: async () => {
      const { data } = await API.get('/trash');
      return data as TrashData;
    },
  });

  const sections = Object.entries(data ?? {}).filter(([, items]) => items.length > 0);

  useEffect(() => {
    if (sections.length > 0 && !activeTab) {
      setActiveTab(sections[0][0]);
    }
  }, [sections.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeItems: TrashItem[] = (data?.[activeTab] ?? []);

  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      await API.post('/trash/restore', { id, type });
    },
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const destroyMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      await API.post('/trash/destroy', { id, type });
    },
    onSuccess: () => {
      setConfirmItem(null);
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
  });

  const isSelected = (id: number) => selected.includes(id);

  const toggleOne = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? activeItems.map((i) => i.id) : []);

  const restoreSelected = () => {
    selected.forEach((id) => restoreMutation.mutate({ id, type: activeTab }));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSelected([]);
  };

  const getSectionLabel = (key: string) => {
    const translated = t(`trash.types.${key}`, { defaultValue: '' });
    return translated || key.replace(/_/g, ' ');
  };

  return (
    <section className="users container">
      <h1 className="main-title">{t('trash.title')}</h1>

      {confirmItem !== null && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('trash.confirmDestroy')}</h3>
            <div className="modal-actions">
              <button
                className="danger"
                onClick={() => destroyMutation.mutate(confirmItem)}
                disabled={destroyMutation.isPending}
              >
                {t('trash.confirm')}
              </button>
              <button className="cancel" onClick={() => setConfirmItem(null)}>
                {t('trash.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-filters" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className="trash-tabs">
          {isLoading
            ? null
            : sections.map(([type, items]) => (
                <button
                  key={type}
                  className={`trash-tab${activeTab === type ? ' active' : ''}`}
                  onClick={() => handleTabChange(type)}
                >
                  {getSectionLabel(type)}
                  <span className="trash-tab-count">{items.length}</span>
                </button>
              ))}
        </div>

        <button
          className="archive-restore-all-btn"
          disabled={!selected.length || restoreMutation.isPending}
          onClick={restoreSelected}
        >
          <i className="fa-solid fa-rotate-left" />
          {t('trash.restoreSelected')} {selected.length > 0 && `(${selected.length})`}
        </button>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={activeItems.length > 0 && selected.length === activeItems.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                  disabled={isLoading || activeItems.length === 0}
                />
              </th>
              <th>{t('trash.id')}</th>
              <th>{t('trash.name')}</th>
              <th>{t('trash.deletedAt')}</th>
              <th>{t('trash.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={6} columnCount={5} />
            ) : sections.length === 0 ? (
              <EmptyState colSpan={5} message={t('trash.noData')} />
            ) : activeItems.length === 0 ? (
              <EmptyState colSpan={5} message={t('trash.noData')} />
            ) : (
              activeItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>{item.id}</td>
                  <td>{getDisplayName(activeTab, item)}</td>
                  <td>{formatDate(item.deleted_at)}</td>
                  <td className="actions">
                    <button
                      className="archive-restore-btn"
                      onClick={() => restoreMutation.mutate({ id: item.id, type: activeTab })}
                      title={t('trash.restore')}
                      disabled={restoreMutation.isPending}
                    >
                      <i className="fa-solid fa-rotate-left" />
                    </button>
                    <Protected permission="trash.delete">
                      <button
                        className="user-delete-btn"
                        onClick={() => setConfirmItem({ type: activeTab, id: item.id })}
                        title={t('trash.destroy')}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Protected>
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

export default TrashPage;
