import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { API } from '../../api/api';
import '../finance/finance.css';
import './debts.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import type { Branch } from '../../types';

// ─── Local Type Definitions ──────────────────────────────────────────────────

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
  created_at?: string;
}

type DebtType = 'give' | 'return' | 'forgive';
type DebtStatus = 'pending' | 'sent' | 'approved' | 'rejected';

interface DebtTransferRecord {
  id: number;
  giver_jamgarma_id: number;
  receiver_jamgarma_id: number;
  cash_amount: number;
  non_cash_amount: number;
  amount: number;
  description?: string;
  status: DebtStatus;
  sender_name?: string;
  sender_date?: string;
  approver_name?: string;
  approver_date?: string;
  rejecter_name?: string;
  rejecter_date?: string;
  created_at: string;
  giver_jamgarma?: Jamgarma;
  receiver_jamgarma?: Jamgarma;
}

interface DebtTransfer extends DebtTransferRecord {
  type: DebtType;
}

const ITEMS_PER_PAGE = 10;

const SECTION_OPTIONS: Record<string, string> = {
  harmless_point: "Zararsiz ishlash nuqtasi",
  marginal_income: "Marjinal daromad",
  adjusted_income: "Muvofiqlashtirilgan daromad (MD)",
};

// Real backend resources — each debt "type" maps to its own endpoint group.
const ENDPOINT_MAP: Record<DebtType, string> = {
  give: '/jamgarma-loans',
  return: '/jamgarma-loan-repayments',
  forgive: '/jamgarma-loan-forfeitures',
};

const isPendingStatus = (status: DebtStatus) => status === 'pending' || status === 'sent';

type DebtsView = 'list' | 'select-type' | 'create';

// ─── Pagination Sub-Component ────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
}

const DebtsPagination = ({
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

// ─── Main Component ──────────────────────────────────────────────────────────

const DebtsPage = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // ── View state ──────────────────────────────────────────────────
  const [view, setView] = useState<DebtsView>('list');
  const [transferType, setTransferType] = useState<DebtType>('give');

  // ── List UI state ───────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewingTransfer, setViewingTransfer] = useState<DebtTransfer | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Form state ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    giver_jamgarma_id: '',
    receiver_jamgarma_id: '',
    cash_amount: '',
    non_cash_amount: '',
    description: '',
  });

  // ─── API Queries ──────────────────────────────────────────────────────────

  const { data: jamgarmas = [] } = useQuery<Jamgarma[]>({
    queryKey: ['jamgarmas'],
    queryFn: async () => {
      const { data } = await API.get('/jamgarmas');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const { data: loans = [], isLoading: loansLoading } = useQuery<DebtTransferRecord[]>({
    queryKey: ['jamgarma-loans'],
    queryFn: async () => {
      const { data } = await API.get('/jamgarma-loans');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    placeholderData: keepPreviousData,
  });

  const { data: repayments = [], isLoading: repaymentsLoading } = useQuery<DebtTransferRecord[]>({
    queryKey: ['jamgarma-loan-repayments'],
    queryFn: async () => {
      const { data } = await API.get('/jamgarma-loan-repayments');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    placeholderData: keepPreviousData,
  });

  const { data: forfeitures = [], isLoading: forfeituresLoading } = useQuery<DebtTransferRecord[]>({
    queryKey: ['jamgarma-loan-forfeitures'],
    queryFn: async () => {
      const { data } = await API.get('/jamgarma-loan-forfeitures');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    placeholderData: keepPreviousData,
  });

  const transfersLoading = loansLoading || repaymentsLoading || forfeituresLoading;

  const transfers: DebtTransfer[] = [
    ...loans.map((r) => ({ ...r, type: 'give' as const })),
    ...repayments.map((r) => ({ ...r, type: 'return' as const })),
    ...forfeitures.map((r) => ({ ...r, type: 'forgive' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ─── Mutations ────────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({
      giver_jamgarma_id: '',
      receiver_jamgarma_id: '',
      cash_amount: '',
      non_cash_amount: '',
      description: '',
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['jamgarma-loans'] });
    queryClient.invalidateQueries({ queryKey: ['jamgarma-loan-repayments'] });
    queryClient.invalidateQueries({ queryKey: ['jamgarma-loan-forfeitures'] });
    queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
  };

  const createTransferMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await API.post(ENDPOINT_MAP[transferType], payload);
      return data;
    },
    onSuccess: () => {
      invalidateAll();
      setShowConfirm(false);
      setView('list');
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: DebtType }) => {
      const { data } = await API.post(`${ENDPOINT_MAP[type]}/${id}/approve`);
      return data;
    },
    onSuccess: () => invalidateAll(),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: DebtType }) => {
      const { data } = await API.post(`${ENDPOINT_MAP[type]}/${id}/reject`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jamgarma-loans'] });
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatAmount = (val: number | string) =>
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

  const getStatusLabel = (status: DebtStatus) => {
    const map: Record<DebtStatus, string> = {
      pending: t('debts.statusPending'),
      sent: t('debts.statusPending'),
      approved: t('debts.statusApproved'),
      rejected: t('debts.statusRejected'),
    };
    return map[status] || status;
  };

  const getBranchLabel = (branch?: Branch) => {
    if (!branch) return '-';
    return getLocalized(branch, 'name', i18n.language) || branch.name_uz || '-';
  };

  const getJamgarmaName = (j?: Jamgarma) => {
    if (!j) return '-';
    return getLocalized(j, 'name', i18n.language) || j.name_uz || `Jam'garma #${j.id}`;
  };

  const getSectionLabel = (j?: Jamgarma) => {
    const value = j?.jamgarma_fund_type || j?.section_uz;
    if (!value) return '';
    return SECTION_OPTIONS[value] || value;
  };

  const getGiverLabel = (type: DebtType) => {
    if (type === 'give') return t('debts.giverLabelGive');
    if (type === 'return') return t('debts.giverLabelReturn');
    return t('debts.giverLabelForgive');
  };

  const getReceiverLabel = (type: DebtType) => {
    if (type === 'give') return t('debts.receiverLabelGive');
    if (type === 'return') return t('debts.receiverLabelReturn');
    return t('debts.receiverLabelForgive');
  };

  const getGiverTag = (type: DebtType) => {
    if (type === 'give') return t('debts.giverTagGive');
    if (type === 'return') return t('debts.giverTagReturn');
    return t('debts.giverTagForgive');
  };

  const getReceiverTag = (type: DebtType) => {
    if (type === 'give') return t('debts.receiverTagGive');
    if (type === 'return') return t('debts.receiverTagReturn');
    return t('debts.receiverTagForgive');
  };

  const getTypeLabel = (type: DebtType) => {
    if (type === 'give') return t('debts.typeGive');
    if (type === 'return') return t('debts.typeReturn');
    return t('debts.typeForgive');
  };

  // ─── Transfer Create Logic ─────────────────────────────────────────────────

  const giverJamgarma = jamgarmas.find((j) => j.id === Number(form.giver_jamgarma_id));
  const receiverJamgarma = jamgarmas.find((j) => j.id === Number(form.receiver_jamgarma_id));

  const cashAmountNum = Number(form.cash_amount.replace(/\s/g, '')) || 0;
  const nonCashAmountNum = Number(form.non_cash_amount.replace(/\s/g, '')) || 0;
  const totalAmountNum = cashAmountNum + nonCashAmountNum;

  const cashExceeds = !!giverJamgarma && cashAmountNum > giverJamgarma.cash_balance;
  const nonCashExceeds = !!giverJamgarma && nonCashAmountNum > giverJamgarma.non_cash_balance;

  const openTypeSelect = () => setView('select-type');

  const startCreate = (type: DebtType) => {
    setTransferType(type);
    resetForm();
    setView('create');
  };

  const backToTypeSelect = () => {
    setView('select-type');
    resetForm();
  };

  const handleTransferSubmit = () => {
    if (
      !form.giver_jamgarma_id ||
      !form.receiver_jamgarma_id ||
      totalAmountNum <= 0 ||
      cashExceeds ||
      nonCashExceeds
    )
      return;
    setShowConfirm(true);
  };

  const confirmTransfer = () => {
    createTransferMutation.mutate({
      giver_jamgarma_id: Number(form.giver_jamgarma_id),
      receiver_jamgarma_id: Number(form.receiver_jamgarma_id),
      cash_amount: cashAmountNum,
      non_cash_amount: nonCashAmountNum,
      amount: totalAmountNum,
      description: form.description,
    });
  };

  // ─── Filtered & Paginated Data ─────────────────────────────────────────────

  const filteredTransfers = (() => {
    if (!search) return transfers;
    const q = search.toLowerCase();
    return transfers.filter(
      (tr) =>
        tr.description?.toLowerCase().includes(q) ||
        getJamgarmaName(tr.giver_jamgarma).toLowerCase().includes(q) ||
        getJamgarmaName(tr.receiver_jamgarma).toLowerCase().includes(q),
    );
  })();

  const paginatedTransfers = (() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredTransfers.slice(start, start + ITEMS_PER_PAGE);
  })();

  const lastPage = Math.max(1, Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="finances debts container">
      {/* ── View Transfer Detail Modal ───────────────────────────── */}
      {viewingTransfer && (
        <div className="fin-modal-overlay" onClick={() => setViewingTransfer(null)}>
          <div className="fin-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-detail-header">
              <i className="fa-solid fa-right-left fin-detail-icon" />
              <h3>{t('debts.detailsTitle')}</h3>
            </div>
            <div className="fin-detail-rows">
              <div className="fin-detail-row">
                <span>{t('debts.id')}</span>
                <span>{viewingTransfer.id}</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('debts.transferType')}</span>
                <span>{getTypeLabel(viewingTransfer.type)}</span>
              </div>
              <div className="fin-detail-row">
                <span>{getGiverLabel(viewingTransfer.type)}</span>
                <span>{getJamgarmaName(viewingTransfer.giver_jamgarma)}</span>
              </div>
              <div className="fin-detail-row">
                <span>{getReceiverLabel(viewingTransfer.type)}</span>
                <span>{getJamgarmaName(viewingTransfer.receiver_jamgarma)}</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('debts.cashAmount')}</span>
                <span className="fin-text-green">{formatAmount(viewingTransfer.cash_amount)} UZS</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('debts.nonCashAmount')}</span>
                <span className="fin-text-green">
                  {formatAmount(viewingTransfer.non_cash_amount)} UZS
                </span>
              </div>
              <div className="fin-detail-row">
                <span>{t('debts.totalAmount')}</span>
                <span className="fin-text-orange">{formatAmount(viewingTransfer.amount)} UZS</span>
              </div>
              <div className="fin-detail-row">
                <span>{t('debts.status')}</span>
                <span
                  className={
                    viewingTransfer.status === 'approved'
                      ? 'fin-text-green'
                      : viewingTransfer.status === 'rejected'
                        ? 'fin-text-red'
                        : 'fin-text-orange'
                  }
                >
                  {getStatusLabel(viewingTransfer.status)}
                </span>
              </div>
              {viewingTransfer.sender_name && (
                <div className="fin-detail-row">
                  <span>{t('debts.senderPerson')}</span>
                  <span>
                    {viewingTransfer.sender_name}
                    {viewingTransfer.sender_date ? ` (${formatDate(viewingTransfer.sender_date)})` : ''}
                  </span>
                </div>
              )}
              {viewingTransfer.approver_name && (
                <div className="fin-detail-row">
                  <span>{t('debts.approverPerson')}</span>
                  <span>
                    {viewingTransfer.approver_name}
                    {viewingTransfer.approver_date
                      ? ` (${formatDate(viewingTransfer.approver_date)})`
                      : ''}
                  </span>
                </div>
              )}
              {viewingTransfer.rejecter_name && (
                <div className="fin-detail-row">
                  <span>{t('debts.rejecterPerson')}</span>
                  <span>
                    {viewingTransfer.rejecter_name}
                    {viewingTransfer.rejecter_date
                      ? ` (${formatDate(viewingTransfer.rejecter_date)})`
                      : ''}
                  </span>
                </div>
              )}
              {viewingTransfer.description && (
                <div className="fin-detail-row">
                  <span>{t('debts.description')}</span>
                  <span>{viewingTransfer.description}</span>
                </div>
              )}
              <div className="fin-detail-row">
                <span>{t('debts.createdAt')}</span>
                <span>{formatDate(viewingTransfer.created_at)}</span>
              </div>
            </div>
            <div className="fin-modal-actions">
              <button className="fin-btn-cancel" onClick={() => setViewingTransfer(null)}>
                {t('debts.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Transfer Modal ────────────────────────────────── */}
      {showConfirm && (
        <div className="fin-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="fin-modal fin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <p className="fin-confirm-text">{t('debts.confirmTransfer')}</p>
            <div className="fin-modal-actions">
              <button
                className="fin-btn-save"
                onClick={confirmTransfer}
                disabled={createTransferMutation.isPending}
              >
                {createTransferMutation.isPending ? t('debts.saving') : t('debts.confirm')}
              </button>
              <button className="fin-btn-cancel" onClick={() => setShowConfirm(false)}>
                {t('debts.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          LIST VIEW
         ══════════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <>
          <div className="fin-toolbar">
            <div className="fin-search-box">
              <input
                placeholder={t('debts.searchPlaceholder')}
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
              {t('debts.filter')}
            </button>
            <Protected permission="">
              <button className="fin-btn-add" onClick={openTypeSelect}>
                {t('debts.createTransfer')}
              </button>
            </Protected>
          </div>

          <div className="fin-table-wrapper">
            <table className="fin-table fin-transfers-table debts-transfers-table">
              <thead>
                <tr>
                  <th>{t('debts.id')}</th>
                  <th>{t('debts.giverFund')}</th>
                  <th>{t('debts.receiverFund')}</th>
                  <th>{t('debts.amount')}</th>
                  <th>{t('debts.responsiblePersons')}</th>
                  <th>{t('debts.description')}</th>
                  <th>{t('debts.status')}</th>
                  <th>{t('debts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transfersLoading ? (
                  <TableSkeleton rowCount={10} columnCount={8} />
                ) : paginatedTransfers.length > 0 ? (
                  paginatedTransfers.map((tr, idx) => (
                    <tr key={`${tr.type}-${tr.id}`}>
                      <td>{String((page - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, '0')}</td>

                      {/* Giver fund */}
                      <td>
                        <div className="debts-fund-cell">
                          <span className="debts-fund-name">
                            {getJamgarmaName(tr.giver_jamgarma)}
                          </span>
                          {getSectionLabel(tr.giver_jamgarma) && (
                            <span className="debts-fund-section">
                              {getSectionLabel(tr.giver_jamgarma)}
                            </span>
                          )}
                          <span className="debts-fund-tag">{getGiverTag(tr.type)}</span>
                        </div>
                      </td>

                      {/* Receiver fund */}
                      <td>
                        <div className="debts-fund-cell">
                          <span className="debts-fund-name">
                            {getJamgarmaName(tr.receiver_jamgarma)}
                          </span>
                          {getSectionLabel(tr.receiver_jamgarma) && (
                            <span className="debts-fund-section">
                              {getSectionLabel(tr.receiver_jamgarma)}
                            </span>
                          )}
                          <span className="debts-fund-tag">{getReceiverTag(tr.type)}</span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td>
                        <div className="fin-balance-cards">
                          <span className="fin-balance-card-total fin-text-orange">
                            {formatAmount(tr.amount)} UZS
                          </span>
                          <span className="fin-balance-card fin-balance-card--cash">
                            <i className="fa-solid fa-money-bill" />
                            {formatAmount(tr.cash_amount)} UZS
                          </span>
                          <span className="fin-balance-card fin-balance-card--noncash">
                            <i className="fa-solid fa-credit-card" />
                            {formatAmount(tr.non_cash_amount)} UZS
                          </span>
                        </div>
                      </td>

                      {/* Responsible Persons */}
                      <td className="fin-responsible-cell">
                        {tr.sender_name && (
                          <div className="fin-resp-row">
                            <span className="fin-resp-label">{t('debts.senderPerson')}:</span>
                            <span className="fin-resp-name">{tr.sender_name}</span>
                            {tr.sender_date && (
                              <span className="fin-resp-date">{formatDate(tr.sender_date)}</span>
                            )}
                          </div>
                        )}
                        {tr.approver_name && (
                          <div className="fin-resp-row">
                            <span className="fin-resp-label">{t('debts.approverPerson')}:</span>
                            <span className="fin-resp-name">{tr.approver_name}</span>
                            {tr.approver_date && (
                              <span className="fin-resp-date">{formatDate(tr.approver_date)}</span>
                            )}
                          </div>
                        )}
                        {tr.rejecter_name && (
                          <div className="fin-resp-row">
                            <span className="fin-resp-label">{t('debts.rejecterPerson')}:</span>
                            <span className="fin-resp-name">{tr.rejecter_name}</span>
                            {tr.rejecter_date && (
                              <span className="fin-resp-date">{formatDate(tr.rejecter_date)}</span>
                            )}
                          </div>
                        )}
                        {!tr.sender_name && !tr.approver_name && !tr.rejecter_name && '-'}
                      </td>

                      {/* Description */}
                      <td className="fin-description-cell">{tr.description || '-'}</td>

                      {/* Status */}
                      <td>
                        <span
                          className={`fin-status-text${
                            tr.status === 'approved'
                              ? ' fin-text-green'
                              : tr.status === 'rejected'
                                ? ' fin-text-red'
                                : ' fin-text-orange'
                          }`}
                        >
                          {getStatusLabel(tr.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="fin-actions">
                          <button
                            className="fin-action-btn fin-action-view"
                            onClick={() => setViewingTransfer(tr)}
                            title={t('debts.view')}
                          >
                            <i className="fa-solid fa-eye" />
                          </button>
                        </div>
                        {isPendingStatus(tr.status) && (
                          <div className="fin-transfer-action-btns">
                            <Protected permission="">
                              <button
                                className="fin-btn-approve"
                                onClick={() => approveMutation.mutate({ id: tr.id, type: tr.type })}
                                disabled={approveMutation.isPending}
                              >
                                {t('debts.approve')}
                              </button>
                            </Protected>
                            {tr.type === 'give' && (
                              <Protected permission="">
                                <button
                                  className="fin-btn-reject"
                                  onClick={() => rejectMutation.mutate({ id: tr.id, type: tr.type })}
                                  disabled={rejectMutation.isPending}
                                >
                                  {t('debts.reject')}
                                </button>
                              </Protected>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={8} message={t('debts.noTransfers')} />
                )}
              </tbody>
            </table>
          </div>

          <DebtsPagination
            currentPage={page}
            lastPage={lastPage}
            from={(page - 1) * ITEMS_PER_PAGE + 1}
            to={Math.min(page * ITEMS_PER_PAGE, filteredTransfers.length)}
            total={filteredTransfers.length}
            onPageChange={setPage}
            label={t('debts.total')}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SELECT TRANSFER TYPE
         ══════════════════════════════════════════════════════════════ */}
      {view === 'select-type' && (
        <div className="fin-modal-overlay" onClick={() => setView('list')}>
          <div className="fin-transfer-type-select" onClick={(e) => e.stopPropagation()}>
            <h3 className="fin-type-select-title">{t('debts.selectTransferType')}</h3>
            <button className="fin-type-btn" onClick={() => startCreate('give')}>
              {t('debts.typeGive')}
            </button>
            <button className="fin-type-btn" onClick={() => startCreate('return')}>
              {t('debts.typeReturn')}
            </button>
            <button className="fin-type-btn" onClick={() => startCreate('forgive')}>
              {t('debts.typeForgive')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CREATE TRANSFER
         ══════════════════════════════════════════════════════════════ */}
      {view === 'create' && (
        <div className="fin-transfer-create">
          <button className="fin-back-btn" onClick={backToTypeSelect}>
            <i className="fa-solid fa-arrow-left" />
            {t('debts.back')}
          </button>

          <div className="fin-transfer-layout">
            {/* Left: Fund Cards */}
            <div className="fin-transfer-cards">
              {/* Giver Card */}
              <div className="fin-account-card">
                <div className="fin-card-header">
                  <i className="fa-solid fa-circle-info fin-card-icon" />
                  <h4>{t('debts.giverCard')}</h4>
                </div>
                {giverJamgarma ? (
                  <div className="fin-card-details">
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.id')}</span>
                      <span className="fin-card-value">{giverJamgarma.id}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.branch')}</span>
                      <span className="fin-card-value">{getBranchLabel(giverJamgarma.branch)}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.fundName')}</span>
                      <span className="fin-card-value">{getJamgarmaName(giverJamgarma)}</span>
                    </div>
                    {getSectionLabel(giverJamgarma) && (
                      <div className="fin-card-row">
                        <span className="fin-card-label">{t('debts.section')}</span>
                        <span className="fin-card-value">{getSectionLabel(giverJamgarma)}</span>
                      </div>
                    )}
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.currentBalance')}</span>
                      <span className="fin-card-value">
                        <span className="fin-balance-card fin-balance-card--cash">
                          <i className="fa-solid fa-money-bill" />
                          {formatAmount(giverJamgarma.cash_balance)} UZS
                        </span>{' '}
                        <span className="fin-balance-card fin-balance-card--noncash">
                          <i className="fa-solid fa-credit-card" />
                          {formatAmount(giverJamgarma.non_cash_balance)} UZS
                        </span>
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.status')}</span>
                      <span
                        className={`fin-card-value ${
                          giverJamgarma.status === 'active' ? 'fin-text-green' : 'fin-text-red'
                        }`}
                      >
                        {giverJamgarma.status === 'active'
                          ? t('debts.statusActive')
                          : giverJamgarma.status === 'frozen'
                            ? t('debts.statusFrozen')
                            : t('debts.statusInactive')}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.createdAt')}</span>
                      <span className="fin-card-value">{formatDate(giverJamgarma.created_at)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="fin-card-empty">{t('debts.selectGiverFirst')}</p>
                )}
              </div>

              {/* Receiver Card */}
              <div className="fin-account-card">
                <div className="fin-card-header">
                  <i className="fa-solid fa-circle-info fin-card-icon" />
                  <h4>{t('debts.receiverCard')}</h4>
                </div>
                {receiverJamgarma ? (
                  <div className="fin-card-details">
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.id')}</span>
                      <span className="fin-card-value">{receiverJamgarma.id}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.branch')}</span>
                      <span className="fin-card-value">
                        {getBranchLabel(receiverJamgarma.branch)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.fundName')}</span>
                      <span className="fin-card-value">{getJamgarmaName(receiverJamgarma)}</span>
                    </div>
                    {getSectionLabel(receiverJamgarma) && (
                      <div className="fin-card-row">
                        <span className="fin-card-label">{t('debts.section')}</span>
                        <span className="fin-card-value">{getSectionLabel(receiverJamgarma)}</span>
                      </div>
                    )}
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.currentBalance')}</span>
                      <span className="fin-card-value">
                        <span className="fin-balance-card fin-balance-card--cash">
                          <i className="fa-solid fa-money-bill" />
                          {formatAmount(receiverJamgarma.cash_balance)} UZS
                        </span>{' '}
                        <span className="fin-balance-card fin-balance-card--noncash">
                          <i className="fa-solid fa-credit-card" />
                          {formatAmount(receiverJamgarma.non_cash_balance)} UZS
                        </span>
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.status')}</span>
                      <span
                        className={`fin-card-value ${
                          receiverJamgarma.status === 'active' ? 'fin-text-green' : 'fin-text-red'
                        }`}
                      >
                        {receiverJamgarma.status === 'active'
                          ? t('debts.statusActive')
                          : receiverJamgarma.status === 'frozen'
                            ? t('debts.statusFrozen')
                            : t('debts.statusInactive')}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('debts.createdAt')}</span>
                      <span className="fin-card-value">
                        {formatDate(receiverJamgarma.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="fin-card-empty">{t('debts.selectReceiverFirst')}</p>
                )}
              </div>
            </div>

            {/* Right: Transfer Form */}
            <div className="fin-transfer-form-card">
              <div className="fin-card-header">
                <i className="fa-solid fa-right-left fin-card-icon" />
                <h4>{t('debts.newTransfer')}</h4>
              </div>

              <div className="fin-form-group">
                <label>{getGiverLabel(transferType)}</label>
                <select
                  value={form.giver_jamgarma_id}
                  onChange={(e) => setForm({ ...form, giver_jamgarma_id: e.target.value })}
                >
                  <option value="">{t('debts.choose')}</option>
                  {jamgarmas.map((j) => (
                    <option key={j.id} value={j.id}>
                      {getJamgarmaName(j)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fin-form-group">
                <label>{getReceiverLabel(transferType)}</label>
                <select
                  value={form.receiver_jamgarma_id}
                  onChange={(e) => setForm({ ...form, receiver_jamgarma_id: e.target.value })}
                >
                  <option value="">{t('debts.choose')}</option>
                  {jamgarmas
                    .filter((j) => j.id !== Number(form.giver_jamgarma_id))
                    .map((j) => (
                      <option key={j.id} value={j.id}>
                        {getJamgarmaName(j)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="fin-form-group">
                <label>{t('debts.cashAmount')}</label>
                <div className="fin-amount-input-wrap">
                  <input
                    type="text"
                    value={form.cash_amount}
                    onChange={(e) => setForm({ ...form, cash_amount: e.target.value })}
                    placeholder="0"
                    className={cashExceeds ? 'fin-input-error' : ''}
                  />
                  <span className="fin-currency-badge">UZS</span>
                </div>
                {cashExceeds && giverJamgarma && (
                  <span className="fin-field-error">
                    {t('debts.amountExceedsBalance')}: {formatAmount(giverJamgarma.cash_balance)} UZS
                  </span>
                )}
              </div>

              <div className="fin-form-group">
                <label>{t('debts.nonCashAmount')}</label>
                <div className="fin-amount-input-wrap">
                  <input
                    type="text"
                    value={form.non_cash_amount}
                    onChange={(e) => setForm({ ...form, non_cash_amount: e.target.value })}
                    placeholder="0"
                    className={nonCashExceeds ? 'fin-input-error' : ''}
                  />
                  <span className="fin-currency-badge">UZS</span>
                </div>
                {nonCashExceeds && giverJamgarma && (
                  <span className="fin-field-error">
                    {t('debts.amountExceedsBalance')}: {formatAmount(giverJamgarma.non_cash_balance)}{' '}
                    UZS
                  </span>
                )}
              </div>

              <div className="fin-form-group">
                <label>{t('debts.totalAmount')}</label>
                <input type="text" readOnly value={`${formatAmount(totalAmountNum)} UZS`} className="fin-readonly-input" />
              </div>

              <div className="fin-form-group">
                <label>{t('debts.description')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder={t('debts.descriptionPlaceholder')}
                />
              </div>

              <button
                className="fin-btn-transfer"
                onClick={handleTransferSubmit}
                disabled={
                  !form.giver_jamgarma_id ||
                  !form.receiver_jamgarma_id ||
                  totalAmountNum <= 0 ||
                  cashExceeds ||
                  nonCashExceeds
                }
              >
                {t('debts.sendTransfer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DebtsPage;
