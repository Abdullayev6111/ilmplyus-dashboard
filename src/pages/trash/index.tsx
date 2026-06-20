import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import { useTranslation } from 'react-i18next';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import '../users/users.css';

type TrashItem = Record<string, unknown> & { id: number };

type TrashGroup = {
  type: string;
  count: number;
  data: TrashItem[];
};

type TrashAllData = Record<string, TrashGroup>;

type PaginatedTrash = {
  type: string;
  data: {
    data: TrashItem[];
    meta: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
};

const PER_PAGE = 20;

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

const formatDate = (val: unknown) => (val ? String(val).slice(0, 10).replaceAll('-', '.') : '-');

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const pages = useMemo((): (number | '...')[] => {
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, '...', totalPages];
    if (currentPage >= totalPages - 2)
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  return (
    <div className="db-pagination__pages">
      <button
        type="button"
        className="db-pagination__btn db-pagination__btn--nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Oldingi sahifa"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="db-pagination__ellipsis">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={`db-pagination__btn${currentPage === page ? ' db-pagination__btn--active' : ''}`}
            onClick={() => onPageChange(page as number)}
            aria-label={`${page}-sahifa`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        className="db-pagination__btn db-pagination__btn--nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Keyingi sahifa"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
};

const TrashPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [confirmItem, setConfirmItem] = useState<{ type: string; id: number } | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const markedRef = useRef(new Set<string>());

  // All types with counts for tabs
  const { data: allData, isLoading: isLoadingAll } = useQuery<TrashAllData>({
    queryKey: ['trash-groups'],
    queryFn: async () => {
      const { data } = await API.get('/trash');
      return data as TrashAllData;
    },
  });

  // Unviewed counts per type for red badges
  const { data: unviewedData } = useQuery<{ unviewed_count: number; by_type: Record<string, number> }>({
    queryKey: ['trash-unviewed-count'],
    queryFn: async () => {
      const { data } = await API.get('/trash/unviewed-count');
      return data;
    },
  });

  const tabs = Object.entries(allData ?? {}).filter(([, group]) => group.count > 0);
  const activeTab = selectedTab || tabs[0]?.[0] || '';

  // Paginated data for the active tab
  const { data: tabData, isLoading: isLoadingTab } = useQuery<PaginatedTrash>({
    queryKey: ['trash-paginated', activeTab, page],
    queryFn: async () => {
      const { data } = await API.get('/trash', {
        params: { type: activeTab, per_page: PER_PAGE, page },
      });
      return data as PaginatedTrash;
    },
    enabled: !!activeTab,
  });

  const activeItems: TrashItem[] = tabData?.data?.data ?? [];
  const meta = tabData?.data?.meta;
  const totalPages = meta?.last_page ?? 1;
  const total = meta?.total ?? 0;

  // Mark visible items as viewed
  useEffect(() => {
    if (!activeItems.length || !activeTab) return;
    const toMark = activeItems.filter(
      (item) => !markedRef.current.has(`${activeTab}:${item.id}`),
    );
    if (!toMark.length) return;
    toMark.forEach((item) => {
      markedRef.current.add(`${activeTab}:${item.id}`);
      API.post('/trash/mark-viewed', { type: activeTab, id: item.id }).catch(() => {});
    });
    queryClient.invalidateQueries({ queryKey: ['trash-unviewed-count'] });
  }, [activeItems, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      await API.post('/trash/restore', { id, type });
    },
    onSuccess: () => {
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ['trash-groups'] });
      queryClient.invalidateQueries({ queryKey: ['trash-paginated'] });
    },
  });

  const destroyMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      await API.post('/trash/destroy', { id, type });
    },
    onSuccess: () => {
      setConfirmItem(null);
      queryClient.invalidateQueries({ queryKey: ['trash-groups'] });
      queryClient.invalidateQueries({ queryKey: ['trash-paginated'] });
    },
  });

  const isSelected = (id: number) => selected.includes(id);

  const toggleOne = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? activeItems.map((i) => i.id) : []);

  const restoreSelected = () => {
    if (!activeTab) return;
    selected.filter(Boolean).forEach((id) => restoreMutation.mutate({ id, type: activeTab }));
  };

  const handleTabChange = (key: string) => {
    setSelectedTab(key);
    setSelected([]);
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setSelected([]);
    setPage(p);
  };

  const getSectionLabel = (key: string) => {
    const translated = t(`trash.types.${key}`, { defaultValue: '' });
    return translated || key.replace(/_/g, ' ');
  };

  const isLoading = isLoadingAll || (!!activeTab && isLoadingTab && !tabData);
  const startItem = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
  const endItem = Math.min(page * PER_PAGE, total);

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

      <div
        className="users-filters"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="trash-tabs">
          {!isLoadingAll &&
            tabs.map(([type, group]) => {
              const unviewed = unviewedData?.by_type?.[type] ?? 0;
              return (
                <button
                  key={type}
                  className={`trash-tab${activeTab === type ? ' active' : ''}`}
                  onClick={() => handleTabChange(type)}
                >
                  {getSectionLabel(type)}
                  <span className="trash-tab-count">{group.count}</span>
                  {unviewed > 0 && (
                    <span className="trash-tab-unviewed">{unviewed}</span>
                  )}
                </button>
              );
            })}
        </div>

        <button
          className="archive-restore-all-btn"
          disabled={!selected.length || !activeTab || restoreMutation.isPending}
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
            ) : tabs.length === 0 ? (
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
                      onClick={() =>
                        activeTab &&
                        item.id &&
                        restoreMutation.mutate({ id: item.id, type: activeTab })
                      }
                      title={t('trash.restore')}
                      disabled={restoreMutation.isPending || !activeTab}
                    >
                      <i className="fa-solid fa-rotate-left" />
                    </button>
                    <Protected permission="trash.delete">
                      <button
                        className="user-delete-btn"
                        onClick={() =>
                          activeTab &&
                          item.id &&
                          setConfirmItem({ type: activeTab, id: item.id })
                        }
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

      {totalPages > 1 && (
        <div className="db-pagination">
          <span className="db-pagination__info">
            {t('registration.paginationAll')}: {total}
            {t('registration.paginationFrom')} {startItem}-{endItem}
            {t('registration.paginationTo')}
          </span>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </section>
  );
};

export default TrashPage;
