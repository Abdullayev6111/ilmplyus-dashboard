import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { API } from '@/api/api';
import './finance.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '@/utils/getLocalized';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyState from '@/components/EmptyState';
import { Protected } from '@/components/Protected';
import { usePermission } from '@/hooks/usePermission';
import type { Branch } from '@/types/common.types';

// ─── Local Type Definitions ──────────────────────────────────────────────────

interface FinanceAccount {
  id: number;
  branch_id: number;
  account_type: string; // "0001" | "0002"
  account_type_name?: string; // "Naqt (Cash)"
  account_number: string;
  balance: number;
  status: 'active' | 'inactive';
  is_active?: boolean;
  description_uz?: string;
  created_at: string;
  updated_at: string;
  branch?: Branch;
}

interface TransferPerson {
  id: number;
  full_name?: string;
  username?: string;
}

interface TransferAccountRef {
  id: number;
  account_number?: string;
  account_type?: string;
  account_type_name?: string;
  balance?: number;
}

interface JamgarmaRef {
  id: number;
  name?: string | null;
  name_uz?: string | null;
  name_ru?: string | null;
  name_en?: string | null;
  cash_balance?: number;
  non_cash_balance?: number;
  total_balance?: number;
}

interface TransferCommonFields {
  id: number;
  amount: number;
  notes?: string | null;
  status: 'pending' | 'sent' | 'approved' | 'rejected' | 'cancelled';
  sent_by?: TransferPerson | null;
  sent_at?: string;
  approved_by?: TransferPerson | null;
  approved_at?: string;
  rejected_by?: TransferPerson | null;
  rejected_at?: string;
  cancelled_by?: TransferPerson | null;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

interface FinanceTransfer extends TransferCommonFields {
  source_account?: TransferAccountRef;
  destination_account?: TransferAccountRef;
}

interface AccountToJamgarmaTransfer extends TransferCommonFields {
  source_account?: TransferAccountRef;
  destination_jamgarma?: JamgarmaRef;
  account_type_name?: string;
}

type UnifiedTransfer =
  | ({ kind: 'account' } & FinanceTransfer)
  | ({ kind: 'jamgarma' } & AccountToJamgarmaTransfer);

interface Jamgarma {
  id: number;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  status: 'active' | 'inactive' | 'frozen';
  cash_balance: number;
  non_cash_balance: number;
  total_balance: number;
  branch?: Branch;
  created_at?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

type TransferView = 'list' | 'select-type' | 'create' | 'savings';

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

const FinancePagination = ({
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

const Finances = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Create permissions per transfer kind (drives the "create" button + type picker).
  const canCreateAccountTransfer = usePermission('chart_of_accounts_transfers.create');
  const canCreateSavingsTransfer = usePermission('account_to_jamgarma_transfers.create');
  const canCreateAnyTransfer = canCreateAccountTransfer || canCreateSavingsTransfer;

  // ── View state ──────────────────────────────────────────────────
  const [transferView, setTransferView] = useState<TransferView>('list');

  // ── Transfers UI state ──────────────────────────────────────────
  const [transferSearch, setTransferSearch] = useState('');
  const [transferPage, setTransferPage] = useState(1);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);
  const [selectedTransferIds, setSelectedTransferIds] = useState<string[]>([]);

  // ── Transfer form state ────────────────────────────────────────
  const [transferForm, setTransferForm] = useState({
    sender_account_id: '',
    receiver_account_id: '',
    amount: '',
    description: '',
  });

  // ── Savings transfer form state ────────────────────────────────
  const [savingsForm, setSavingsForm] = useState({
    sender_account_id: '',
    jamgarma_id: '',
    amount: '',
    description: '',
  });
  const [showConfirmSavings, setShowConfirmSavings] = useState(false);

  // ─── API Queries ──────────────────────────────────────────────────────────

  const { data: accounts = [] } = useQuery<FinanceAccount[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data } = await API.get('/chart-of-accounts');
      return Array.isArray(data) ? data : data?.data || [];
    },
    placeholderData: keepPreviousData,
  });

  const { data: transfers = [], isLoading: transfersListLoading } = useQuery<FinanceTransfer[]>({
    queryKey: ['chart-of-accounts-transfers'],
    queryFn: async () => {
      const { data } = await API.get('/chart-of-accounts-transfers');
      return Array.isArray(data) ? data : data?.data || [];
    },
    placeholderData: keepPreviousData,
  });

  const { data: jamgarmaTransfers = [], isLoading: jamgarmaTransfersLoading } = useQuery<
    AccountToJamgarmaTransfer[]
  >({
    queryKey: ['account-to-jamgarma-transfers'],
    queryFn: async () => {
      const { data } = await API.get('/account-to-jamgarma-transfers');
      return Array.isArray(data) ? data : data?.data || [];
    },
    placeholderData: keepPreviousData,
  });

  const { data: jamgarmas = [] } = useQuery<Jamgarma[]>({
    queryKey: ['jamgarmas'],
    queryFn: async () => {
      const { data } = await API.get('/jamgarmas');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createTransferMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await API.post('/chart-of-accounts-transfers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setShowConfirmTransfer(false);
      setTransferView('list');
      setTransferForm({
        sender_account_id: '',
        receiver_account_id: '',
        amount: '',
        description: '',
      });
    },
  });

  const createSavingsTransferMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await API.post('/jamgarma-transfers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
      setShowConfirmSavings(false);
      setTransferView('list');
      setSavingsForm({ sender_account_id: '', jamgarma_id: '', amount: '', description: '' });
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.post(`/chart-of-accounts-transfers/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const rejectTransferMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.post(`/chart-of-accounts-transfers/${id}/reject`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const cancelTransferMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.post(`/chart-of-accounts-transfers/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
    },
  });

  const approveJamgarmaTransferMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.post(`/account-to-jamgarma-transfers/${id}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-to-jamgarma-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
    },
  });

  const rejectJamgarmaTransferMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.post(`/account-to-jamgarma-transfers/${id}/reject`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-to-jamgarma-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
    },
  });

  const cancelJamgarmaTransferMutation = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await API.post(`/account-to-jamgarma-transfers/${id}/cancel`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-to-jamgarma-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['jamgarmas'] });
    },
  });

  const getTransferKey = (tr: UnifiedTransfer) => `${tr.kind}-${tr.id}`;

  const toggleAllTransfers = (checked: boolean) =>
    setSelectedTransferIds(checked ? paginatedTransfers.map(getTransferKey) : []);

  const toggleOneTransfer = (key: string) =>
    setSelectedTransferIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );

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

  const getAccountStatusLabel = (status: string) => {
    if (status === 'active') return t('finance.statusActive');
    if (status === 'inactive') return t('finance.statusInactive');
    return status;
  };

  const getTransferStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      approved: t('finance.statusApproved'),
      pending: t('finance.statusPending'),
      sent: t('finance.statusPending'),
      rejected: t('finance.statusRejected'),
      cancelled: t('finance.statusCancelled'),
    };
    return map[status] || status;
  };

  const isPendingTransferStatus = (status: string) => status === 'pending' || status === 'sent';

  const getJamgarmaRefName = (j?: JamgarmaRef) => {
    if (!j) return '-';
    return getLocalized(j, 'name', i18n.language) || j.name_uz || j.name || `Jam'garma #${j.id}`;
  };

  const getAccountTypeName = (type: string, typeName?: string) => {
    if (typeName) return typeName;
    if (type === '0001') return '0001 - Naqd';
    if (type === '0002') return '0002 - Naqdsiz';
    return type;
  };

  const getBranchLabel = (branch?: Branch) => {
    if (!branch) return '-';
    return getLocalized(branch, 'name', i18n.language) || branch.name_uz || '-';
  };

  const isCashAccountType = (acc?: { account_type?: string; account_type_name?: string }) => {
    if (!acc) return false;
    if (acc.account_type) return acc.account_type === '0001';
    return !acc.account_type_name?.toLowerCase().includes('siz');
  };

  const resolveTransferAccount = (
    ref?: TransferAccountRef,
  ): (TransferAccountRef & { branch?: Branch; account_type?: string }) | undefined => {
    if (!ref) return undefined;
    return accounts.find((a) => a.id === ref.id) ?? ref;
  };

  // ─── Transfer Logic ────────────────────────────────────────────────────────

  const senderAccount = accounts.find((a) => a.id === Number(transferForm.sender_account_id));
  const receiverAccount = accounts.find((a) => a.id === Number(transferForm.receiver_account_id));

  const savingsSenderAccount = accounts.find((a) => a.id === Number(savingsForm.sender_account_id));
  const selectedJamgarma = jamgarmas.find((j) => j.id === Number(savingsForm.jamgarma_id));

  const getJamgarmaName = (j: Jamgarma) =>
    getLocalized(j, 'name', i18n.language) || j.name_uz || `Jam'garma #${j.id}`;

  const handleTransferSubmit = () => {
    if (
      !transferForm.sender_account_id ||
      !transferForm.receiver_account_id ||
      !transferForm.amount
    )
      return;
    setShowConfirmTransfer(true);
  };

  const confirmTransfer = () => {
    createTransferMutation.mutate({
      sender_account_id: Number(transferForm.sender_account_id),
      receiver_account_id: Number(transferForm.receiver_account_id),
      amount: Number(transferForm.amount.replace(/\s/g, '')),
      currency: 'UZS',
      description: transferForm.description,
    });
  };

  // ─── Filtered & Paginated Data ─────────────────────────────────────────────

  const unifiedTransfers: UnifiedTransfer[] = [
    ...transfers.map((tr) => ({ ...tr, kind: 'account' as const })),
    ...jamgarmaTransfers.map((tr) => ({ ...tr, kind: 'jamgarma' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const transfersLoading = transfersListLoading || jamgarmaTransfersLoading;

  const filteredTransfers = (() => {
    if (!transferSearch) return unifiedTransfers;
    const q = transferSearch.toLowerCase();
    return unifiedTransfers.filter((tr) => {
      if (tr.notes?.toLowerCase().includes(q)) return true;
      if (tr.source_account?.account_number?.toLowerCase().includes(q)) return true;
      if (tr.kind === 'account') {
        return !!tr.destination_account?.account_number?.toLowerCase().includes(q);
      }
      return getJamgarmaRefName(tr.destination_jamgarma).toLowerCase().includes(q);
    });
  })();

  const paginatedTransfers = (() => {
    const start = (transferPage - 1) * ITEMS_PER_PAGE;
    return filteredTransfers.slice(start, start + ITEMS_PER_PAGE);
  })();

  const transferLastPage = Math.max(1, Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="finances container">
      {/* ── Confirm Transfer Modal ────────────────────────────── */}
      {showConfirmTransfer && (
        <div className="fin-modal-overlay" onClick={() => setShowConfirmTransfer(false)}>
          <div className="fin-modal fin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <p className="fin-confirm-text">{t('finance.confirmTransfer')}</p>
            <div className="fin-modal-actions">
              <button
                className="fin-btn-save"
                onClick={confirmTransfer}
                disabled={createTransferMutation.isPending}
              >
                {createTransferMutation.isPending ? t('finance.saving') : t('finance.confirm')}
              </button>
              <button className="fin-btn-cancel" onClick={() => setShowConfirmTransfer(false)}>
                {t('finance.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSFER LIST VIEW ─────────────────────────────────── */}
      {transferView === 'list' && (
        <>
          {/* Toolbar */}
          <div className="fin-toolbar">
            <div className="fin-search-box">
              <input
                placeholder={t('finance.searchPlaceholder')}
                value={transferSearch}
                onChange={(e) => {
                  setTransferSearch(e.target.value);
                  setTransferPage(1);
                }}
              />
              <i className="fa-solid fa-magnifying-glass" />
            </div>
            <button className="fin-btn-filter">
              <i className="fa-solid fa-filter" />
              {t('finance.filter')}
            </button>
            {canCreateAnyTransfer && (
              <button className="fin-btn-add" onClick={() => setTransferView('select-type')}>
                {t('finance.createTransfer')}
              </button>
            )}
          </div>

          {/* Transfers Table */}
          <div className="fin-table-wrapper">
            <table className="fin-table fin-transfers-table fin-table--with-checkbox">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        selectedTransferIds.length === paginatedTransfers.length &&
                        paginatedTransfers.length > 0
                      }
                      onChange={(e) => toggleAllTransfers(e.target.checked)}
                    />
                  </th>
                  <th>{t('finance.id')}</th>
                  <th>{t('finance.senderAccount')}</th>
                  <th>{t('finance.receiverAccount')}</th>
                  <th>{t('finance.amount')}</th>
                  <th>{t('finance.responsiblePersons')}</th>
                  <th>{t('finance.description')}</th>
                  <th>{t('finance.status')}</th>
                  <th>{t('finance.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {transfersLoading ? (
                  <TableSkeleton rowCount={10} columnCount={9} />
                ) : paginatedTransfers.length > 0 ? (
                  paginatedTransfers.map((tr) => {
                    const key = getTransferKey(tr);
                    const senderAcc = resolveTransferAccount(tr.source_account);
                    const receiverAcc =
                      tr.kind === 'account' ? resolveTransferAccount(tr.destination_account) : undefined;
                    const approverEntity = tr.approved_by || tr.rejected_by || tr.cancelled_by;
                    const approverDate = tr.approved_at || tr.rejected_at || tr.cancelled_at;
                    const approveMutation =
                      tr.kind === 'account' ? approveTransferMutation : approveJamgarmaTransferMutation;
                    const rejectMutation =
                      tr.kind === 'account' ? rejectTransferMutation : rejectJamgarmaTransferMutation;
                    const cancelMutation =
                      tr.kind === 'account' ? cancelTransferMutation : cancelJamgarmaTransferMutation;
                    const transferModule =
                      tr.kind === 'account'
                        ? 'chart_of_accounts_transfers'
                        : 'account_to_jamgarma_transfers';
                    return (
                    <tr key={key}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedTransferIds.includes(key)}
                          onChange={() => toggleOneTransfer(key)}
                        />
                      </td>
                      <td>{tr.id}</td>

                      {/* Sender Account */}
                      <td>
                        <div className="fin-account-cell">
                          <span className="fin-branch-name">
                            {getBranchLabel(senderAcc?.branch)}
                          </span>
                          <span className="fin-acct-row">
                            <span className="fin-acct-number">
                              {tr.source_account?.account_number || '-'}
                            </span>
                            <span
                              className={`fin-type-badge ${
                                isCashAccountType(senderAcc) ? 'fin-badge-cash' : 'fin-badge-noncash'
                              }`}
                            >
                              {isCashAccountType(senderAcc)
                                ? t('finance.typeCash')
                                : t('finance.typeNonCash')}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Receiver Account / Jamgarma Fund */}
                      <td>
                        {tr.kind === 'account' ? (
                          <div className="fin-account-cell">
                            <span className="fin-branch-name">
                              {getBranchLabel(receiverAcc?.branch)}
                            </span>
                            <span className="fin-acct-row">
                              <span className="fin-acct-number">
                                {tr.destination_account?.account_number || '-'}
                              </span>
                              <span
                                className={`fin-type-badge ${
                                  isCashAccountType(receiverAcc)
                                    ? 'fin-badge-cash'
                                    : 'fin-badge-noncash'
                                }`}
                              >
                                {isCashAccountType(receiverAcc)
                                  ? t('finance.typeCash')
                                  : t('finance.typeNonCash')}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="fin-account-cell">
                            <span className="fin-branch-name">
                              {getJamgarmaRefName(tr.destination_jamgarma)}
                            </span>
                            <span className="fin-acct-row">
                              <span
                                className={`fin-type-badge ${
                                  isCashAccountType({ account_type_name: tr.account_type_name })
                                    ? 'fin-badge-cash'
                                    : 'fin-badge-noncash'
                                }`}
                              >
                                {isCashAccountType({ account_type_name: tr.account_type_name })
                                  ? t('finance.typeCash')
                                  : t('finance.typeNonCash')}
                              </span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="fin-amount-cell fin-text-orange">
                        {formatAmount(tr.amount)} UZS
                      </td>

                      {/* Responsible Persons */}
                      <td className="fin-responsible-cell">
                        {tr.sent_by && (
                          <div className="fin-resp-row">
                            <span className="fin-resp-label">{t('finance.senderPerson')}:</span>
                            <span className="fin-resp-name">{tr.sent_by.full_name}</span>
                            {tr.sent_at && (
                              <span className="fin-resp-date">{formatDate(tr.sent_at)}</span>
                            )}
                          </div>
                        )}
                        {approverEntity && (
                          <div className="fin-resp-row">
                            <span className="fin-resp-label">
                              {t('finance.approverPerson')}:
                            </span>
                            <span className="fin-resp-name">{approverEntity.full_name}</span>
                            {approverDate && (
                              <span className="fin-resp-date">{formatDate(approverDate)}</span>
                            )}
                          </div>
                        )}
                        {!tr.sent_by && !approverEntity && '-'}
                      </td>

                      {/* Description */}
                      <td className="fin-description-cell">{tr.notes || '-'}</td>

                      {/* Status */}
                      <td>
                        <span
                          className={`fin-status-text${
                            tr.status === 'approved'
                              ? ' fin-text-green'
                              : tr.status === 'cancelled' || tr.status === 'rejected'
                                ? ' fin-text-red'
                                : ' fin-text-orange'
                          }`}
                        >
                          {getTransferStatusLabel(tr.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        {isPendingTransferStatus(tr.status) && (
                          <div className="fin-transfer-action-btns">
                            <Protected permission={`${transferModule}.approve`}>
                              <button
                                className="fin-btn-approve"
                                onClick={() => approveMutation.mutate(tr.id)}
                                disabled={approveMutation.isPending}
                              >
                                {t('finance.approve')}
                              </button>
                            </Protected>
                            <Protected permission={`${transferModule}.reject`}>
                              <button
                                className="fin-btn-reject"
                                onClick={() => rejectMutation.mutate(tr.id)}
                                disabled={rejectMutation.isPending}
                              >
                                {t('finance.reject')}
                              </button>
                            </Protected>
                            <Protected permission={`${transferModule}.cancel`}>
                              <button
                                className="fin-btn-cancel-transfer"
                                onClick={() => cancelMutation.mutate(tr.id)}
                                disabled={cancelMutation.isPending}
                              >
                                {t('finance.cancelTransfer')}
                              </button>
                            </Protected>
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <EmptyState colSpan={9} message={t('finance.noTransfers')} />
                )}
              </tbody>
            </table>
          </div>

          {/* Transfers Pagination */}
          <FinancePagination
            currentPage={transferPage}
            lastPage={transferLastPage}
            from={(transferPage - 1) * ITEMS_PER_PAGE + 1}
            to={Math.min(transferPage * ITEMS_PER_PAGE, filteredTransfers.length)}
            total={filteredTransfers.length}
            onPageChange={setTransferPage}
            label={t('finance.total')}
          />
        </>
      )}

      {/* ── SELECT TRANSFER TYPE MODAL ───────────────────────── */}
      {transferView === 'select-type' && (
        <div className="fin-modal-overlay" onClick={() => setTransferView('list')}>
          <div className="fin-transfer-type-select" onClick={(e) => e.stopPropagation()}>
            <h3 className="fin-type-select-title">{t('finance.selectTransferType')}</h3>
            {canCreateAccountTransfer && (
              <button className="fin-type-btn" onClick={() => setTransferView('create')}>
                {t('finance.typeAccountToAccount')}
              </button>
            )}
            {canCreateSavingsTransfer && (
              <button className="fin-type-btn" onClick={() => setTransferView('savings')}>
                {t('finance.typeAccountToSavings')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── TRANSFER CREATE VIEW ──────────────────────────────── */}
      {transferView === 'create' && (
        <div className="fin-transfer-create">
          <button
            className="fin-back-btn"
            onClick={() => {
              setTransferView('select-type');
              setTransferForm({
                sender_account_id: '',
                receiver_account_id: '',
                amount: '',
                description: '',
              });
            }}
          >
            <i className="fa-solid fa-arrow-left" />
            {t('finance.back')}
          </button>

          <div className="fin-transfer-layout">
            {/* Left: Account Cards */}
            <div className="fin-transfer-cards">
              {/* Sender Card */}
              <div className="fin-account-card">
                <div className="fin-card-header">
                  <i className="fa-solid fa-building-columns fin-card-icon" />
                  <h4>{t('finance.senderAccountCard')}</h4>
                </div>
                {senderAccount ? (
                  <div className="fin-card-details">
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.id')}</span>
                      <span className="fin-card-value">{senderAccount.id}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.branch')}</span>
                      <span className="fin-card-value">
                        {getBranchLabel(senderAccount.branch)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.accountType')}</span>
                      <span className="fin-card-value">
                        {getAccountTypeName(
                          senderAccount.account_type,
                          senderAccount.account_type_name,
                        )}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.accountNumber')}</span>
                      <span className="fin-card-value fin-mono">
                        {senderAccount.account_number}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.currentBalance')}</span>
                      <span className="fin-card-value fin-text-green">
                        {formatAmount(senderAccount.balance)} UZS
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.status')}</span>
                      <span className="fin-card-value fin-text-green">
                        {getAccountStatusLabel(senderAccount.status)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.createdAt')}</span>
                      <span className="fin-card-value">
                        {formatDate(senderAccount.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="fin-card-empty">{t('finance.selectSenderFirst')}</p>
                )}
              </div>

              {/* Receiver Card */}
              <div className="fin-account-card">
                <div className="fin-card-header">
                  <i className="fa-solid fa-building-columns fin-card-icon" />
                  <h4>{t('finance.receiverAccountCard')}</h4>
                </div>
                {receiverAccount ? (
                  <div className="fin-card-details">
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.id')}</span>
                      <span className="fin-card-value">{receiverAccount.id}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.branch')}</span>
                      <span className="fin-card-value">
                        {getBranchLabel(receiverAccount.branch)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.accountType')}</span>
                      <span className="fin-card-value">
                        {getAccountTypeName(
                          receiverAccount.account_type,
                          receiverAccount.account_type_name,
                        )}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.accountNumber')}</span>
                      <span className="fin-card-value fin-mono">
                        {receiverAccount.account_number}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.currentBalance')}</span>
                      <span className="fin-card-value fin-text-green">
                        {formatAmount(receiverAccount.balance)} UZS
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.status')}</span>
                      <span className="fin-card-value fin-text-green">
                        {getAccountStatusLabel(receiverAccount.status)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.createdAt')}</span>
                      <span className="fin-card-value">
                        {formatDate(receiverAccount.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="fin-card-empty">{t('finance.selectReceiverFirst')}</p>
                )}
              </div>
            </div>

            {/* Right: Transfer Form */}
            <div className="fin-transfer-form-card">
              <div className="fin-card-header">
                <i className="fa-solid fa-building-columns fin-card-icon" />
                <h4>{t('finance.newTransfer')}</h4>
              </div>

              <div className="fin-form-group">
                <label>{t('finance.senderAccountLabel')}</label>
                <select
                  value={transferForm.sender_account_id}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, sender_account_id: e.target.value })
                  }
                >
                  <option value="">{t('finance.choose')}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fin-form-group">
                <label>{t('finance.receiverAccountLabel')}</label>
                <select
                  value={transferForm.receiver_account_id}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, receiver_account_id: e.target.value })
                  }
                >
                  <option value="">{t('finance.choose')}</option>
                  {accounts
                    .filter((a) => a.id !== Number(transferForm.sender_account_id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_number}
                      </option>
                    ))}
                </select>
              </div>

              <div className="fin-form-group">
                <label>{t('finance.amount')}</label>
                <div className="fin-amount-input-wrap">
                  <input
                    type="text"
                    value={transferForm.amount}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, amount: e.target.value })
                    }
                    placeholder="0"
                    className={
                      senderAccount &&
                      transferForm.amount &&
                      Number(transferForm.amount.replace(/\s/g, '')) > senderAccount.balance
                        ? 'fin-input-error'
                        : ''
                    }
                  />
                  <span className="fin-currency-badge">UZS</span>
                </div>
                {senderAccount &&
                  transferForm.amount &&
                  Number(transferForm.amount.replace(/\s/g, '')) > senderAccount.balance && (
                    <span className="fin-field-error">
                      {t('finance.amountExceedsBalance')}: {formatAmount(senderAccount.balance)}{' '}
                      UZS
                    </span>
                  )}
              </div>

              <div className="fin-form-group">
                <label>{t('finance.description')}</label>
                <textarea
                  value={transferForm.description}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, description: e.target.value })
                  }
                  rows={4}
                  placeholder={t('finance.descriptionPlaceholder')}
                />
              </div>

              <button
                className="fin-btn-transfer"
                onClick={handleTransferSubmit}
                disabled={
                  !transferForm.sender_account_id ||
                  !transferForm.receiver_account_id ||
                  !transferForm.amount ||
                  (!!senderAccount &&
                    Number(transferForm.amount.replace(/\s/g, '')) > senderAccount.balance)
                }
              >
                {t('finance.sendTransfer')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── SAVINGS TRANSFER CREATE VIEW ─────────────────────── */}
      {transferView === 'savings' && (
        <div className="fin-transfer-create">
          <button
            className="fin-back-btn"
            onClick={() => {
              setTransferView('select-type');
              setSavingsForm({
                sender_account_id: '',
                jamgarma_id: '',
                amount: '',
                description: '',
              });
            }}
          >
            <i className="fa-solid fa-arrow-left" />
            {t('finance.back')}
          </button>

          {/* Confirm savings transfer modal */}
          {showConfirmSavings && (
            <div className="fin-modal-overlay" onClick={() => setShowConfirmSavings(false)}>
              <div className="fin-modal fin-modal-sm" onClick={(e) => e.stopPropagation()}>
                <p className="fin-confirm-text">{t('finance.confirmTransfer')}</p>
                <div className="fin-modal-actions">
                  <button
                    className="fin-btn-save"
                    onClick={() => {
                      createSavingsTransferMutation.mutate({
                        sender_account_id: Number(savingsForm.sender_account_id),
                        jamgarma_id: Number(savingsForm.jamgarma_id),
                        amount: Number(savingsForm.amount.replace(/\s/g, '')),
                        currency: 'UZS',
                        description: savingsForm.description,
                      });
                    }}
                    disabled={createSavingsTransferMutation.isPending}
                  >
                    {createSavingsTransferMutation.isPending
                      ? t('finance.saving')
                      : t('finance.confirm')}
                  </button>
                  <button
                    className="fin-btn-cancel"
                    onClick={() => setShowConfirmSavings(false)}
                  >
                    {t('finance.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="fin-transfer-layout">
            {/* Left: Cards */}
            <div className="fin-transfer-cards">
              {/* Sender Account Card */}
              <div className="fin-account-card">
                <div className="fin-card-header">
                  <i className="fa-solid fa-building-columns fin-card-icon" />
                  <h4>{t('finance.senderAccountCard')}</h4>
                </div>
                {savingsSenderAccount ? (
                  <div className="fin-card-details">
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.id')}</span>
                      <span className="fin-card-value">{savingsSenderAccount.id}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.branch')}</span>
                      <span className="fin-card-value">
                        {getBranchLabel(savingsSenderAccount.branch)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.accountType')}</span>
                      <span className="fin-card-value">
                        {getAccountTypeName(
                          savingsSenderAccount.account_type,
                          savingsSenderAccount.account_type_name,
                        )}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.accountNumber')}</span>
                      <span className="fin-card-value fin-mono">
                        {savingsSenderAccount.account_number}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.currentBalance')}</span>
                      <span className="fin-card-value fin-text-green">
                        {formatAmount(savingsSenderAccount.balance)} UZS
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.status')}</span>
                      <span className="fin-card-value fin-text-green">
                        {getAccountStatusLabel(savingsSenderAccount.status)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.createdAt')}</span>
                      <span className="fin-card-value">
                        {formatDate(savingsSenderAccount.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="fin-card-empty">{t('finance.selectSenderFirst')}</p>
                )}
              </div>

              {/* Receiver Jamgarma Card */}
              <div className="fin-account-card">
                <div className="fin-card-header">
                  <h4>{t('finance.receiverSavingsCard')}</h4>
                </div>
                {selectedJamgarma ? (
                  <div className="fin-card-details">
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.id')}</span>
                      <span className="fin-card-value">{selectedJamgarma.id}</span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.savingsName')}</span>
                      <span className="fin-card-value">
                        {getJamgarmaName(selectedJamgarma)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.cashBalance')}</span>
                      <span className="fin-card-value fin-text-green">
                        {formatAmount(selectedJamgarma.cash_balance)} UZS
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.nonCashBalance')}</span>
                      <span className="fin-card-value fin-text-green">
                        {formatAmount(selectedJamgarma.non_cash_balance)} UZS
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.status')}</span>
                      <span
                        className={`fin-card-value ${selectedJamgarma.status === 'active' ? 'fin-text-green' : 'fin-text-red'}`}
                      >
                        {getAccountStatusLabel(selectedJamgarma.status)}
                      </span>
                    </div>
                    <div className="fin-card-row">
                      <span className="fin-card-label">{t('finance.createdAt')}</span>
                      <span className="fin-card-value">
                        {formatDate(selectedJamgarma.created_at)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="fin-card-empty">{t('finance.selectSavingsFirst')}</p>
                )}
              </div>
            </div>

            {/* Right: Savings Transfer Form */}
            <div className="fin-transfer-form-card">
              <div className="fin-card-header">
                <i className="fa-solid fa-piggy-bank fin-card-icon" />
                <h4>{t('finance.newTransfer')}</h4>
              </div>

              <div className="fin-form-group">
                <label>{t('finance.accountNumber')}</label>
                <select
                  value={savingsForm.sender_account_id}
                  onChange={(e) =>
                    setSavingsForm({ ...savingsForm, sender_account_id: e.target.value })
                  }
                >
                  <option value="">{t('finance.choose')}</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fin-form-group">
                <label>{t('finance.savingsLabel')}</label>
                <select
                  value={savingsForm.jamgarma_id}
                  onChange={(e) =>
                    setSavingsForm({ ...savingsForm, jamgarma_id: e.target.value })
                  }
                >
                  <option value="">{t('finance.choose')}</option>
                  {jamgarmas.map((j) => (
                    <option key={j.id} value={j.id}>
                      {getJamgarmaName(j)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fin-form-group">
                <label>{t('finance.amount')}</label>
                <div className="fin-amount-input-wrap">
                  <input
                    type="text"
                    value={savingsForm.amount}
                    onChange={(e) => setSavingsForm({ ...savingsForm, amount: e.target.value })}
                    placeholder="0"
                    className={
                      savingsSenderAccount &&
                      savingsForm.amount &&
                      Number(savingsForm.amount.replace(/\s/g, '')) >
                        savingsSenderAccount.balance
                        ? 'fin-input-error'
                        : ''
                    }
                  />
                  <span className="fin-currency-badge">UZS</span>
                </div>
                {savingsSenderAccount &&
                  savingsForm.amount &&
                  Number(savingsForm.amount.replace(/\s/g, '')) >
                    savingsSenderAccount.balance && (
                    <span className="fin-field-error">
                      {t('finance.amountExceedsBalance')}:{' '}
                      {formatAmount(savingsSenderAccount.balance)} UZS
                    </span>
                  )}
              </div>

              <div className="fin-form-group">
                <label>{t('finance.description')}</label>
                <textarea
                  value={savingsForm.description}
                  onChange={(e) =>
                    setSavingsForm({ ...savingsForm, description: e.target.value })
                  }
                  rows={4}
                  placeholder={t('finance.descriptionPlaceholder')}
                />
              </div>

              <button
                className="fin-btn-transfer"
                onClick={() => setShowConfirmSavings(true)}
                disabled={
                  !savingsForm.sender_account_id ||
                  !savingsForm.jamgarma_id ||
                  !savingsForm.amount ||
                  (!!savingsSenderAccount &&
                    Number(savingsForm.amount.replace(/\s/g, '')) >
                      savingsSenderAccount.balance)
                }
              >
                {t('finance.sendTransfer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Finances;
