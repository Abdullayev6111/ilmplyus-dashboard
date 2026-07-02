import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { API } from '../../api/api';
import './finance.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import type { Branch } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Withdrawer {
  id: number;
  full_name: string;
  username?: string;
}

interface ChartOfAccount {
  id: number;
  account_number: string;
  account_type: string;
  account_type_name?: string;
  balance: number;
  branch_id?: number;
  branch?: { id: number };
}

interface Jamgarma {
  id: number;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  section_uz?: string;
  jamgarma_fund_type?: string;
  status: 'active' | 'inactive' | 'frozen';
  cash_balance: number;
  non_cash_balance: number;
  total_balance: number;
  branch_id?: number;
  branch?: Branch;
  chart_of_accounts?: { id: number; account_number: string; account_type_name?: string };
  withdrawers?: Withdrawer[];
  created_at?: string;
  updated_at?: string;
}

const ITEMS_PER_PAGE = 10;

const SECTION_OPTIONS = [
  { value: 'harmless_point', label: 'Zararsiz ishlar nuqtasi' },
  { value: 'marginal_income', label: 'Marjinal daromad' },
  { value: 'adjusted_income', label: 'Muvofiqlashtirillgan daromad (MD)' },
];

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
}

const JamgarmaPagination = ({
  currentPage,
  lastPage,
  from,
  to,
  total,
  onPageChange,
  label,
}: PaginationProps) => {
  if (total === 0) return null;

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(lastPage - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < lastPage - 2) pages.push('...');
      pages.push(lastPage);
    }
    return pages;
  };

  return (
    <div className="fin-pagination">
      <span className="fin-pagination-info">
        {label}: {total}tadan {from}-{to}tagacha ko'rsatmoqda
      </span>
      <div className="fin-pagination-controls">
        <button
          className="fin-page-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`d-${i}`} className="fin-page-dots">
              ...
            </span>
          ) : (
            <button
              key={p}
              className={`fin-page-btn${currentPage === p ? ' active' : ''}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button
          className="fin-page-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const JamgarmaPage = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // ── UI state ─────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<Jamgarma | null>(null);
  const [viewingItem, setViewingItem] = useState<Jamgarma | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // ── Form state ───────────────────────────────────────────────────
  const [form, setForm] = useState({
    name_uz: '',
    section_uz: '',
    branch_id: '',
    chart_of_accounts_id: '',
    status: 'active',
  });
  const [selectedWithdrawerIds, setSelectedWithdrawerIds] = useState<number[]>([]);
  const [withdrawerDropdown, setWithdrawerDropdown] = useState('');

  // ── Status change state ──────────────────────────────────────────
  const [viewStatusChange, setViewStatusChange] = useState('');
  const [viewStatusNote, setViewStatusNote] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: jamgarmas = [], isLoading } = useQuery<Jamgarma[]>({
    queryKey: ['jamgarmas'],
    queryFn: async () => {
      const { data } = await API.get('/jamgarmas');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    placeholderData: keepPreviousData,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const { data: users = [] } = useQuery<Withdrawer[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await API.get('/users');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const { data: chartAccounts = [] } = useQuery<ChartOfAccount[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data } = await API.get('/chart-of-accounts');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await API.post('/jamgarmas', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: object }) => {
      const { data } = await API.put(`/jamgarmas/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
      closeModal();
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string; note: string }) => {
      const { data } = await API.put(`/jamgarmas/${id}`, { status });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
      setViewingItem((prev) =>
        prev ? { ...prev, status: vars.status as Jamgarma['status'] } : prev,
      );
      setViewStatusChange('');
      setViewStatusNote('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/jamgarmas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
      setDeleteId(null);
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatAmount = (val: number) =>
    Number(val)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} ${dd}.${mo}.${d.getFullYear()}`;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t('jamgarma.statusActive'),
      inactive: t('jamgarma.statusInactive'),
      frozen: t('jamgarma.statusFrozen'),
    };
    return map[status] || status;
  };

  const getBranchLabel = (branch?: Branch) => {
    if (!branch) return '-';
    return getLocalized(branch, 'name', i18n.language) || branch.name_uz || '-';
  };

  const formatWithdrawerName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[0];
    const firstInitial = parts[1]?.[0] ?? '';
    return `${lastName} ${firstInitial}.`;
  };

  const getWithdrawersDisplay = (item: Jamgarma) => {
    if (!item.withdrawers?.length) return ['-'];
    return item.withdrawers.map((w) => formatWithdrawerName(w.full_name));
  };

  const getName = (item: Jamgarma) =>
    getLocalized(item, 'name', i18n.language) || item.name_uz || '-';

  const todayStr = (() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  })();

  // ─── Modal helpers ─────────────────────────────────────────────────────────

  const closeModal = () => {
    setShowCreate(false);
    setEditingItem(null);
    setForm({
      name_uz: '',
      section_uz: '',
      branch_id: '',
      chart_of_accounts_id: '',
      status: 'active',
    });
    setSelectedWithdrawerIds([]);
    setWithdrawerDropdown('');
  };

  const openEdit = (item: Jamgarma) => {
    setEditingItem(item);
    setForm({
      name_uz: item.name_uz || '',
      section_uz: item.jamgarma_fund_type || item.section_uz || '',
      branch_id: item.branch?.id
        ? String(item.branch.id)
        : item.branch_id
          ? String(item.branch_id)
          : '',
      chart_of_accounts_id: item.chart_of_accounts?.id ? String(item.chart_of_accounts.id) : '',
      status: item.status || 'active',
    });
    setSelectedWithdrawerIds(item.withdrawers?.map((w) => w.id) ?? []);
    setShowCreate(true);
  };

  const removeWithdrawer = (uid: number) => {
    setSelectedWithdrawerIds((prev) => prev.filter((id) => id !== uid));
  };

  const handleSubmit = () => {
    if (!editingItem && !form.name_uz) return;
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        payload: {
          name_uz: form.name_uz,
          jamgarma_fund_type: form.section_uz,
          ...(form.section_uz && { section_uz: form.section_uz }),
          ...(form.branch_id && { branch_id: Number(form.branch_id) }),
          withdrawer_ids: selectedWithdrawerIds,
          ...(form.chart_of_accounts_id && {
            chart_of_accounts_id: Number(form.chart_of_accounts_id),
          }),
          status: form.status,
        },
      });
    } else {
      createMutation.mutate({
        name_uz: form.name_uz,
        jamgarma_fund_type: form.section_uz,
        ...(form.section_uz && { section_uz: form.section_uz }),
        ...(form.branch_id && { branch_id: Number(form.branch_id) }),
        withdrawer_ids: selectedWithdrawerIds,
        ...(form.chart_of_accounts_id && {
          chart_of_accounts_id: Number(form.chart_of_accounts_id),
        }),
        status: form.status,
      });
    }
  };

  const closeViewModal = () => {
    setViewingItem(null);
    setViewStatusChange('');
    setViewStatusNote('');
  };

  // ─── Filtered & paginated data ─────────────────────────────────────────────

  const filtered = (() => {
    if (!search) return jamgarmas;
    const q = search.toLowerCase();
    return jamgarmas.filter(
      (j) =>
        (j.name_uz || '').toLowerCase().includes(q) ||
        getSectionLabel(j.jamgarma_fund_type || j.section_uz)
          .toLowerCase()
          .includes(q) ||
        getBranchLabel(j.branch).toLowerCase().includes(q),
    );
  })();

  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const lastPage = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const getSectionLabel = (value?: string) => {
    if (!value) return '-';
    return SECTION_OPTIONS.find((o) => o.value === value)?.label ?? value;
  };

  const availableWithdrawers = users.filter((u) => !selectedWithdrawerIds.includes(u.id));
  const selectedWithdrawerUsers = users.filter((u) => selectedWithdrawerIds.includes(u.id));

  const filteredChartAccounts = form.branch_id
    ? chartAccounts.filter(
        (a) => a.branch?.id === Number(form.branch_id) || a.branch_id === Number(form.branch_id),
      )
    : chartAccounts;

  const displayCashBalance = editingItem?.cash_balance ?? 0;
  const displayNonCashBalance = editingItem?.non_cash_balance ?? 0;
  const displayTotalBalance = displayCashBalance + displayNonCashBalance;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="finances container">
      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fin-modal-overlay" onClick={closeModal}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="fin-modal-title">
              {editingItem ? t('jamgarma.edit') : t('jamgarma.create')}
            </h3>

            <div className="fin-form-group">
              <label>{t('jamgarma.name')}</label>
              <input
                type="text"
                value={form.name_uz}
                onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
                placeholder={t('jamgarma.namePlaceholder')}
              />
            </div>

            <div className="fin-form-group">
              <label>{t('jamgarma.section')}</label>
              <select
                value={form.section_uz}
                onChange={(e) => setForm({ ...form, section_uz: e.target.value })}
              >
                <option value="">{t('jamgarma.choose')}</option>
                {SECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="fin-form-group">
              <label>{t('jamgarma.branch')}</label>
              <select
                value={form.branch_id}
                onChange={(e) =>
                  setForm({ ...form, branch_id: e.target.value, chart_of_accounts_id: '' })
                }
              >
                <option value="">{t('jamgarma.choose')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {getBranchLabel(b)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected withdrawers chips */}
            {selectedWithdrawerUsers.length > 0 && (
              <div className="fin-signatories-selected">
                {selectedWithdrawerUsers.map((u) => (
                  <div key={u.id} className="fin-signatory-chip">
                    <i className="fa-solid fa-check fin-check-icon" />
                    <span>{u.full_name}</span>
                    <button
                      className="fin-signatory-remove"
                      onClick={() => removeWithdrawer(u.id)}
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add withdrawer dropdown */}
            <div className="fin-form-group">
              <label>{t('jamgarma.withdrawers')}</label>
              <select
                value={withdrawerDropdown}
                onChange={(e) => {
                  const uid = parseInt(e.target.value);
                  if (uid && !selectedWithdrawerIds.includes(uid)) {
                    setSelectedWithdrawerIds((prev) => [...prev, uid]);
                  }
                  setWithdrawerDropdown('');
                }}
              >
                <option value="">{t('jamgarma.choose')}</option>
                {availableWithdrawers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="fin-form-group">
              <label>{t('jamgarma.chartOfAccounts')}</label>
              <select
                value={form.chart_of_accounts_id}
                onChange={(e) => setForm({ ...form, chart_of_accounts_id: e.target.value })}
                disabled={!form.branch_id}
              >
                <option value="">
                  {form.branch_id ? t('jamgarma.choose') : t('jamgarma.selectBranchFirst')}
                </option>
                {filteredChartAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_number} {a.account_type_name ? `(${a.account_type_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Balance display */}
            <div className="fin-balance-row">
              <div className="fin-balance-item">
                <span className="fin-balance-label">{t('jamgarma.cashBalance')}</span>
                <span className="fin-balance-value fin-text-green">
                  {formatAmount(displayCashBalance)} UZS
                </span>
              </div>
              <div className="fin-balance-item">
                <span className="fin-balance-label">{t('jamgarma.nonCashBalance')}</span>
                <span className="fin-balance-value fin-text-green">
                  {formatAmount(displayNonCashBalance)} UZS
                </span>
              </div>
              <div className="fin-balance-item fin-balance-total">
                <span className="fin-balance-label">{t('jamgarma.totalBalance')}</span>
                <span className="fin-balance-value fin-text-green">
                  {formatAmount(displayTotalBalance)} UZS
                </span>
              </div>
            </div>

            <div className="fin-form-group">
              <label>{t('jamgarma.statusLabel')}</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">{t('jamgarma.statusActive')}</option>
                <option value="inactive">{t('jamgarma.statusInactive')}</option>
                <option value="frozen">{t('jamgarma.statusFrozen')}</option>
              </select>
            </div>

            <div className="fin-modal-actions">
              <button
                className="fin-btn-save"
                onClick={handleSubmit}
                disabled={
                  (!editingItem && !form.name_uz) ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t('jamgarma.saving')
                  : t('jamgarma.save')}
              </button>
              <button className="fin-btn-cancel" onClick={closeModal} type="button">
                {t('jamgarma.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fin-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="fin-modal fin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <p className="fin-confirm-text">{t('jamgarma.confirmDelete')}</p>
            <div className="fin-modal-actions">
              <button
                className="fin-btn-danger"
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {t('jamgarma.confirm')}
              </button>
              <button className="fin-btn-cancel" onClick={() => setDeleteId(null)}>
                {t('jamgarma.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View / Detail Modal ───────────────────────────────────────────── */}
      {viewingItem && (
        <div className="fin-modal-overlay" onClick={closeViewModal}>
          <div className="fin-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-detail-header">
              <h3>{t('jamgarma.details')}</h3>
            </div>

            <div className="fin-detail-rows">
              <div className="fin-detail-row">
                <span>{t('jamgarma.idLabel')}</span>
                <span>{viewingItem.id}</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('jamgarma.name')}</span>
                <span>{getName(viewingItem)}</span>
              </div>
              {(viewingItem.jamgarma_fund_type || viewingItem.section_uz) && (
                <div className="fin-detail-row">
                  <span>{t('jamgarma.section')}</span>
                  <span>
                    {getSectionLabel(viewingItem.jamgarma_fund_type || viewingItem.section_uz)}
                  </span>
                </div>
              )}
              <div className="fin-detail-row">
                <span>{t('jamgarma.branch')}</span>
                <span>{getBranchLabel(viewingItem.branch)}</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('jamgarma.cashBalance')}</span>
                <span className="fin-text-green">{formatAmount(viewingItem.cash_balance)} UZS</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('jamgarma.nonCashBalance')}</span>
                <span className="fin-text-green">
                  {formatAmount(viewingItem.non_cash_balance)} UZS
                </span>
              </div>
              <div className="fin-detail-row">
                <span>{t('jamgarma.totalBalance')}</span>
                <span className="fin-text-green fin-amount-cell">
                  {formatAmount(viewingItem.total_balance)} UZS
                </span>
              </div>
              <div className="fin-detail-row">
                <span>{t('jamgarma.statusLabel')}</span>
                <span
                  className={viewingItem.status === 'active' ? 'fin-text-green' : 'fin-text-red'}
                >
                  {getStatusLabel(viewingItem.status)}
                </span>
              </div>
              {viewingItem.withdrawers && viewingItem.withdrawers.length > 0 && (
                <div className="fin-detail-row fin-detail-row-signatories">
                  <span>{t('jamgarma.withdrawersList')}</span>
                  <div className="fin-signatory-list-view">
                    {viewingItem.withdrawers.map((w) => (
                      <span key={w.id} className="fin-signatory-tag">
                        {w.full_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewingItem.created_at && (
                <div className="fin-detail-row">
                  <span>{t('jamgarma.dateLabel')}</span>
                  <span>{formatDate(viewingItem.created_at)}</span>
                </div>
              )}
            </div>

            {/* ── Status Change Section ── */}
            <div className="fin-status-change-section">
              <div className="fin-form-group">
                <label>{t('jamgarma.statusChange')}</label>
                <select
                  value={viewStatusChange}
                  onChange={(e) => {
                    setViewStatusChange(e.target.value);
                    setViewStatusNote('');
                  }}
                >
                  <option value="">{t('jamgarma.statusChangePlaceholder')}</option>
                  {viewingItem.status !== 'active' && (
                    <option value="active">{t('jamgarma.setActive')}</option>
                  )}
                  {viewingItem.status !== 'inactive' && (
                    <option value="inactive">{t('jamgarma.setInactive')}</option>
                  )}
                  {viewingItem.status !== 'frozen' && (
                    <option value="frozen">{t('jamgarma.setFrozen')}</option>
                  )}
                </select>
              </div>

              {viewStatusChange && (
                <>
                  <div className="fin-form-group">
                    <label>{t('jamgarma.statusChangedDate')}</label>
                    <input type="text" readOnly value={todayStr} className="fin-readonly-input" />
                  </div>
                  <div className="fin-form-group">
                    <label>{t('jamgarma.statusNote')}</label>
                    <textarea
                      value={viewStatusNote}
                      onChange={(e) => setViewStatusNote(e.target.value)}
                      rows={3}
                      placeholder={t('jamgarma.statusNotePlaceholder')}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="fin-modal-actions">
              {viewStatusChange && (
                <button
                  className="fin-btn-save"
                  disabled={changeStatusMutation.isPending}
                  onClick={() =>
                    changeStatusMutation.mutate({
                      id: viewingItem.id,
                      status: viewStatusChange,
                      note: viewStatusNote,
                    })
                  }
                >
                  {changeStatusMutation.isPending ? t('jamgarma.saving') : t('jamgarma.saveStatus')}
                </button>
              )}
              <button className="fin-btn-cancel" onClick={closeViewModal}>
                {t('jamgarma.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="fin-toolbar">
        <div className="fin-search-box">
          <input
            placeholder={t('jamgarma.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <i className="fa-solid fa-magnifying-glass" />
        </div>
        <button className="fin-btn-filter">
          <i className="fa-solid fa-filter" />
          {t('jamgarma.filter')}
        </button>
        <Protected permission="">
          <button className="fin-btn-add" onClick={() => setShowCreate(true)}>
            {t('jamgarma.add')}
          </button>
        </Protected>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="fin-table-wrapper">
        <table className="fin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('jamgarma.branchCol')}</th>
              <th>{t('jamgarma.nameCol')}</th>
              <th>{t('jamgarma.sectionCol')}</th>
              <th>{t('jamgarma.withdrawersCol')}</th>
              <th>{t('jamgarma.balanceCol')}</th>
              <th>{t('jamgarma.statusCol')}</th>
              <th>{t('jamgarma.dateCol')}</th>
              <th>{t('jamgarma.actionsCol')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={10} columnCount={9} />
            ) : paginated.length > 0 ? (
              paginated.map((item, idx) => (
                <tr key={item.id}>
                  <td>{String((page - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, '0')}</td>
                  <td className="fin-branch-cell">{getBranchLabel(item.branch)}</td>
                  <td>{getName(item)}</td>
                  <td>{getSectionLabel(item.jamgarma_fund_type || item.section_uz)}</td>
                  <td className="fin-signatories-cell">
                    {getWithdrawersDisplay(item).map((name, i) => (
                      <div key={i}>{name}</div>
                    ))}
                  </td>
                  <td>
                    <div className="fin-balance-cards">
                      <span className="fin-balance-card-total">
                        {formatAmount(item.total_balance)} UZS
                      </span>
                      <span className="fin-balance-card fin-balance-card--cash">
                        <i className="fa-solid fa-money-bill" />
                        {t('jamgarma.cashShort')}: {formatAmount(item.cash_balance)}
                      </span>
                      <span className="fin-balance-card fin-balance-card--noncash">
                        <i className="fa-solid fa-credit-card" />
                        {t('jamgarma.nonCashShort')}: {formatAmount(item.non_cash_balance)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`fin-status-text${
                        item.status === 'active' ? ' fin-text-green' : ' fin-text-red'
                      }`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="fin-date-cell">{formatDate(item.created_at)}</td>
                  <td>
                    <div className="fin-actions">
                      <button
                        className="fin-action-btn fin-action-view"
                        onClick={() => {
                          setViewingItem(item);
                          setViewStatusChange('');
                          setViewStatusNote('');
                        }}
                        title={t('jamgarma.view')}
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                      <Protected permission="">
                        <button
                          className="fin-action-btn fin-action-edit"
                          onClick={() => openEdit(item)}
                          title={t('jamgarma.editBtn')}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                      </Protected>
                      <Protected permission="">
                        <button
                          className="fin-action-btn fin-action-delete"
                          onClick={() => setDeleteId(item.id)}
                          title={t('jamgarma.deleteBtn')}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </Protected>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={9} message={t('jamgarma.noData')} />
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      <JamgarmaPagination
        currentPage={page}
        lastPage={lastPage}
        from={(page - 1) * ITEMS_PER_PAGE + 1}
        to={Math.min(page * ITEMS_PER_PAGE, filtered.length)}
        total={filtered.length}
        onPageChange={setPage}
        label={t('finance.total')}
      />
    </section>
  );
};

export default JamgarmaPage;
