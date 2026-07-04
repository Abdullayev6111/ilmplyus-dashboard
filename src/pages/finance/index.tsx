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

// ─── Local Type Definitions ──────────────────────────────────────────────────

interface Position {
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
}

interface SignatoryUser {
  id: number;
  full_name: string;
  position?: Position | null;
}

interface TransferMaker {
  id: number;
  full_name: string;
  username?: string;
}

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
  transfer_makers?: TransferMaker[];
}

interface TransferPerson {
  id: number | null;
  full_name: string | null;
  username?: string | null;
}

interface TransferAccountRef {
  id: number;
  account_number: string;
  account_type_name?: string;
  balance: number;
}

interface FinanceTransfer {
  id: number;
  amount: number;
  notes?: string | null;
  status: 'sent' | 'approved' | 'rejected' | 'cancelled';
  status_name?: string;
  source_account?: TransferAccountRef;
  destination_account?: TransferAccountRef;
  sent_by?: TransferPerson;
  sent_at?: string | null;
  approved_by?: TransferPerson;
  approved_at?: string | null;
  cancelled_by?: TransferPerson;
  cancelled_at?: string | null;
  rejected_by?: TransferPerson;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
}

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

const ACCOUNT_TYPES = [
  { code: '0001', label: '0001 - Naqd' },
  { code: '0002', label: '0002 - Naqdsiz' },
];

const ITEMS_PER_PAGE = 10;

type FinanceTab = 'accounts' | 'transfers';
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

  // ── Tab & view state ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<FinanceTab>('accounts');
  const [transferView, setTransferView] = useState<TransferView>('list');

  // ── Accounts UI state ───────────────────────────────────────────
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
  const [viewingAccount, setViewingAccount] = useState<FinanceAccount | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<number | null>(null);
  const [viewStatusChange, setViewStatusChange] = useState('');
  const [viewStatusNote, setViewStatusNote] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountPage, setAccountPage] = useState(1);

  // ── Account form state ─────────────────────────────────────────
  const [accountForm, setAccountForm] = useState({
    branch_id: '',
    account_type: '',
    status: 'active',
  });
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [signatoryDropdown, setSignatoryDropdown] = useState('');

  // ── Transfers UI state ──────────────────────────────────────────
  const [transferSearch, setTransferSearch] = useState('');
  const [transferPage, setTransferPage] = useState(1);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<FinanceTransfer | null>(null);
  const [selectedTransferIds, setSelectedTransferIds] = useState<number[]>([]);

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

  const { data: accounts = [], isLoading: accountsLoading } = useQuery<FinanceAccount[]>({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data } = await API.get('/chart-of-accounts');
      return Array.isArray(data) ? data : data?.data || [];
    },
    placeholderData: keepPreviousData,
  });

  const { data: transfers = [], isLoading: transfersLoading } = useQuery<FinanceTransfer[]>({
    queryKey: ['chart-of-accounts-transfers'],
    queryFn: async () => {
      const { data } = await API.get('/chart-of-accounts-transfers');
      return Array.isArray(data) ? data : data?.data || [];
    },
    placeholderData: keepPreviousData,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const { data: signatoryUsers = [] } = useQuery<SignatoryUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await API.get('/users');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 1000 * 60 * 30,
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

  const createAccountMutation = useMutation({
    mutationFn: async (payload: object) => {
      const { data } = await API.post('/chart-of-accounts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      closeAccountModal();
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: object }) => {
      const { data } = await API.put(`/chart-of-accounts/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      closeAccountModal();
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note: string }) => {
      const { data } = await API.put(`/chart-of-accounts/${id}`, {
        status,
        is_active: status === 'active',
        description_uz: note || undefined,
      });
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setViewingAccount((prev) =>
        prev ? { ...prev, status: vars.status as 'active' | 'inactive' } : prev,
      );
      setViewStatusChange('');
      setViewStatusNote('');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/chart-of-accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      setDeleteAccountId(null);
    },
  });

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

  const closeTransferView = () => {
    setViewingTransfer(null);
  };

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
      sent: t('finance.statusPending'),
      approved: t('finance.statusApproved'),
      rejected: t('finance.statusRejected'),
      cancelled: t('finance.statusCancelled'),
    };
    return map[status] || status;
  };

  const getAccountTypeName = (type: string, typeName?: string) => {
    if (typeName) return typeName;
    if (type === '0001') return '0001 - Naqd';
    if (type === '0002') return '0002 - Naqdsiz';
    return type;
  };

  const getUserLabel = (user: SignatoryUser) => {
    const pos = getLocalized(user.position, 'name', i18n.language);
    return pos ? `${user.full_name}` : user.full_name;
  };

  const getTransferMakersDisplay = (account: FinanceAccount) => {
    if (!account.transfer_makers?.length) return '-';
    return account.transfer_makers.map((tm) => tm.full_name).join(', ');
  };

  const getBranchLabel = (branch?: Branch) => {
    if (!branch) return '-';
    return getLocalized(branch, 'name', i18n.language) || branch.name_uz || '-';
  };

  // ─── Account Modal Logic ───────────────────────────────────────────────────

  const closeAccountModal = () => {
    setShowCreateAccount(false);
    setEditingAccount(null);
    setAccountForm({ branch_id: '', account_type: '', status: 'active' });
    setSelectedUserIds([]);
    setSignatoryDropdown('');
  };

  const openEditAccount = (account: FinanceAccount) => {
    setEditingAccount(account);
    setAccountForm({
      branch_id: String(account.branch_id),
      account_type: account.account_type,
      status: account.status,
    });
    setSelectedUserIds(account.transfer_makers?.map((tm) => tm.id) || []);
    setShowCreateAccount(true);
  };

  const removeSignatory = (uid: number) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== uid));
  };

  const handleAccountSubmit = () => {
    if (!accountForm.branch_id || !accountForm.account_type) return;
    if (editingAccount) {
      const payload = {
        status: accountForm.status,
        is_active: accountForm.status === 'active',
        transfer_maker_ids: selectedUserIds,
      };
      updateAccountMutation.mutate({ id: editingAccount.id, payload });
    } else {
      const payload = {
        account_type: accountForm.account_type,
        branch_id: Number(accountForm.branch_id),
        status: accountForm.status,
        transfer_maker_ids: selectedUserIds,
      };
      createAccountMutation.mutate(payload);
    }
  };

  // ─── Transfer Logic ────────────────────────────────────────────────────────

  const senderAccount = accounts.find((a) => a.id === Number(transferForm.sender_account_id));
  const receiverAccount = accounts.find((a) => a.id === Number(transferForm.receiver_account_id));

  const savingsSenderAccount = accounts.find((a) => a.id === Number(savingsForm.sender_account_id));
  const selectedJamgarma = jamgarmas.find((j) => j.id === Number(savingsForm.jamgarma_id));

  const getJamgarmaName = (j: Jamgarma) =>
    getLocalized(j, 'name', i18n.language) || j.name_uz || `Jam'garma #${j.id}`;

  // const resetTransferViews = () => {
  //   setTransferView('list');
  //   setTransferForm({
  //     sender_account_id: '',
  //     receiver_account_id: '',
  //     amount: '',
  //     description: '',
  //   });
  //   setSavingsForm({ sender_account_id: '', jamgarma_id: '', amount: '', description: '' });
  //   setShowConfirmTransfer(false);
  //   setShowConfirmSavings(false);
  // };

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
      source_account_id: Number(transferForm.sender_account_id),
      destination_account_id: Number(transferForm.receiver_account_id),
      amount: Number(transferForm.amount.replace(/\s/g, '')),
      currency: 'UZS',
      description: transferForm.description,
    });
  };

  // ─── Filtered & Paginated Data ─────────────────────────────────────────────

  const filteredAccounts = (() => {
    if (!accountSearch) return accounts;
    const q = accountSearch.toLowerCase();
    return accounts.filter(
      (a) =>
        a.account_number?.toLowerCase().includes(q) ||
        getBranchLabel(a.branch).toLowerCase().includes(q),
    );
  })();

  const paginatedAccounts = (() => {
    const start = (accountPage - 1) * ITEMS_PER_PAGE;
    return filteredAccounts.slice(start, start + ITEMS_PER_PAGE);
  })();

  const accountLastPage = Math.max(1, Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE));

  const filteredTransfers = (() => {
    if (!transferSearch) return transfers;
    const q = transferSearch.toLowerCase();
    return transfers.filter(
      (tr) =>
        tr.notes?.toLowerCase().includes(q) ||
        tr.source_account?.account_number?.toLowerCase().includes(q) ||
        tr.destination_account?.account_number?.toLowerCase().includes(q),
    );
  })();

  const paginatedTransfers = (() => {
    const start = (transferPage - 1) * ITEMS_PER_PAGE;
    return filteredTransfers.slice(start, start + ITEMS_PER_PAGE);
  })();

  const transferLastPage = Math.max(1, Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE));

  const toggleTransferSelection = (id: number) => {
    setSelectedTransferIds((prev) =>
      prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id],
    );
  };

  const allPageTransfersSelected =
    paginatedTransfers.length > 0 &&
    paginatedTransfers.every((tr) => selectedTransferIds.includes(tr.id));

  const toggleAllPageTransfers = () => {
    if (allPageTransfersSelected) {
      setSelectedTransferIds((prev) =>
        prev.filter((id) => !paginatedTransfers.some((tr) => tr.id === id)),
      );
    } else {
      setSelectedTransferIds((prev) =>
        Array.from(new Set([...prev, ...paginatedTransfers.map((tr) => tr.id)])),
      );
    }
  };

  const availableSignatories = signatoryUsers.filter((u) => !selectedUserIds.includes(u.id));

  const selectedSignatoryUsers = signatoryUsers.filter((u) => selectedUserIds.includes(u.id));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="finances container">
      {/* ── Tab Navigation ────────────────────────────────────────── */}
      <div className="fin-tabs">
        <button
          className={`fin-tab${activeTab === 'accounts' ? ' active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <i className="fa-solid fa-building-columns" />
          {t('finance.accountsTab')}
        </button>
        <button
          className={`fin-tab${activeTab === 'transfers' ? ' active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          <i className="fa-solid fa-right-left" />
          {t('finance.transfersTab')}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ACCOUNTS TAB
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'accounts' && (
        <>
          {/* ── Create / Edit Account Modal ───────────────────────── */}
          {showCreateAccount && (
            <div className="fin-modal-overlay" onClick={closeAccountModal}>
              <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="fin-modal-title">
                  {editingAccount ? t('finance.editAccount') : t('finance.createAccount')}
                </h3>

                <div className="fin-form-group">
                  <label>{t('finance.selectBranch')}</label>
                  <select
                    value={accountForm.branch_id}
                    onChange={(e) => setAccountForm({ ...accountForm, branch_id: e.target.value })}
                  >
                    <option value="">{t('finance.branchPlaceholder')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {getBranchLabel(b)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fin-form-group">
                  <label>{t('finance.accountType')}</label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, account_type: e.target.value })
                    }
                    disabled={!!editingAccount}
                  >
                    <option value="">{t('finance.choose')}</option>
                    {ACCOUNT_TYPES.map((at) => (
                      <option key={at.code} value={at.code}>
                        {at.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Already selected signatories */}
                {selectedSignatoryUsers.length > 0 && (
                  <div className="fin-signatories-selected">
                    {selectedSignatoryUsers.map((u) => (
                      <div key={u.id} className="fin-signatory-chip">
                        <i className="fa-solid fa-check fin-check-icon" />
                        <span>{getUserLabel(u)}</span>
                        <button
                          className="fin-signatory-remove"
                          onClick={() => removeSignatory(u.id)}
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add signatory dropdown */}
                <div className="fin-form-group">
                  <label>{t('finance.selectTransactionMakers')}</label>
                  <select
                    value={signatoryDropdown}
                    onChange={(e) => {
                      const uid = parseInt(e.target.value);
                      if (uid && !selectedUserIds.includes(uid)) {
                        setSelectedUserIds((prev) => [...prev, uid]);
                      }
                      setSignatoryDropdown('');
                    }}
                  >
                    <option value="">{t('finance.choose')}</option>
                    {availableSignatories.map((u) => (
                      <option key={u.id} value={u.id}>
                        {getUserLabel(u)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fin-modal-actions">
                  <button
                    className="fin-btn-save"
                    onClick={handleAccountSubmit}
                    disabled={
                      !accountForm.branch_id ||
                      !accountForm.account_type ||
                      createAccountMutation.isPending ||
                      updateAccountMutation.isPending
                    }
                  >
                    {createAccountMutation.isPending || updateAccountMutation.isPending
                      ? t('finance.saving')
                      : t('finance.saveAccount')}
                  </button>
                  <button className="fin-btn-cancel" onClick={closeAccountModal} type="button">
                    {t('finance.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Delete Account Confirmation ───────────────────────── */}
          {deleteAccountId !== null && (
            <div className="fin-modal-overlay" onClick={() => setDeleteAccountId(null)}>
              <div className="fin-modal fin-modal-sm" onClick={(e) => e.stopPropagation()}>
                <p className="fin-confirm-text">{t('finance.confirmDeleteAccount')}</p>
                <div className="fin-modal-actions">
                  <button
                    className="fin-btn-danger"
                    onClick={() => deleteAccountMutation.mutate(deleteAccountId)}
                    disabled={deleteAccountMutation.isPending}
                  >
                    {t('finance.confirm')}
                  </button>
                  <button className="fin-btn-cancel" onClick={() => setDeleteAccountId(null)}>
                    {t('finance.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── View Account Detail Modal ─────────────────────────── */}
          {viewingAccount && (
            <div className="fin-modal-overlay" onClick={() => setViewingAccount(null)}>
              <div className="fin-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="fin-detail-header">
                  <i className="fa-solid fa-building-columns fin-detail-icon" />
                  <h3>{t('finance.accountDetails')}</h3>
                </div>
                <div className="fin-detail-rows">
                  <div className="fin-detail-row">
                    <span>{t('finance.id')}</span>
                    <span>{viewingAccount.id}</span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.branch')}</span>
                    <span>{getBranchLabel(viewingAccount.branch)}</span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.accountType')}</span>
                    <span>
                      {getAccountTypeName(
                        viewingAccount.account_type,
                        viewingAccount.account_type_name,
                      )}
                    </span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.accountNumber')}</span>
                    <span className="fin-mono">{viewingAccount.account_number}</span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.currentBalance')}</span>
                    <span className="fin-text-green">
                      {formatAmount(viewingAccount.balance)} UZS
                    </span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.status')}</span>
                    <span
                      className={
                        viewingAccount.status === 'active' ? 'fin-text-green' : 'fin-text-red'
                      }
                    >
                      {getAccountStatusLabel(viewingAccount.status)}
                    </span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.createdAt')}</span>
                    <span>{formatDate(viewingAccount.created_at)}</span>
                  </div>
                  {viewingAccount.transfer_makers && viewingAccount.transfer_makers.length > 0 && (
                    <div className="fin-detail-row fin-detail-row-signatories">
                      <span>{t('finance.transferMakers')}</span>
                      <div className="fin-signatory-list-view">
                        {viewingAccount.transfer_makers.map((tm) => (
                          <span key={tm.id} className="fin-signatory-tag">
                            {tm.full_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Status Change Section ── */}
                <div className="fin-status-change-section">
                  <div className="fin-form-group">
                    <label>{t('finance.accountStatus')}</label>
                    <select
                      value={viewStatusChange}
                      onChange={(e) => {
                        setViewStatusChange(e.target.value);
                        setViewStatusNote('');
                      }}
                    >
                      <option value="">{t('finance.selectStatusChange')}</option>
                      {viewingAccount.status !== 'active' && (
                        <option value="active">{t('finance.statusActive')}</option>
                      )}
                      {viewingAccount.status !== 'inactive' && (
                        <option value="inactive">{t('finance.statusInactive')}</option>
                      )}
                    </select>
                  </div>

                  {viewStatusChange && (
                    <>
                      <div className="fin-form-group">
                        <label>{t('finance.statusChangedAt')}</label>
                        <input
                          type="text"
                          readOnly
                          value={(() => {
                            const now = new Date();
                            return `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
                          })()}
                          className="fin-readonly-input"
                        />
                      </div>
                      <div className="fin-form-group">
                        <label>{t('finance.statusNote')}</label>
                        <textarea
                          value={viewStatusNote}
                          onChange={(e) => setViewStatusNote(e.target.value)}
                          rows={3}
                          placeholder={t('finance.statusNotePlaceholder')}
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
                          id: viewingAccount.id,
                          status: viewStatusChange,
                          note: viewStatusNote,
                        })
                      }
                    >
                      {changeStatusMutation.isPending
                        ? t('finance.saving')
                        : t('finance.saveStatus')}
                    </button>
                  )}
                  <button
                    className="fin-btn-cancel"
                    onClick={() => {
                      setViewingAccount(null);
                      setViewStatusChange('');
                      setViewStatusNote('');
                    }}
                  >
                    {t('finance.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Accounts Toolbar ──────────────────────────────────── */}
          <div className="fin-toolbar">
            <div className="fin-search-box">
              <input
                placeholder={t('finance.searchPlaceholder')}
                value={accountSearch}
                onChange={(e) => {
                  setAccountSearch(e.target.value);
                  setAccountPage(1);
                }}
              />
              <i className="fa-solid fa-magnifying-glass" />
            </div>
            <button className="fin-btn-filter">
              <i className="fa-solid fa-filter" />
              {t('finance.filter')}
            </button>
            <Protected permission="finance.create">
              <button className="fin-btn-add" onClick={() => setShowCreateAccount(true)}>
                {t('finance.addAccount')}
              </button>
            </Protected>
          </div>

          {/* ── Accounts Table ────────────────────────────────────── */}
          <div className="fin-table-wrapper">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>{t('finance.id')}</th>
                  <th>{t('finance.branch')}</th>
                  <th>{t('finance.accountNumber')}</th>
                  <th>{t('finance.transferMakers')}</th>
                  <th>{t('finance.balance')}</th>
                  <th>{t('finance.status')}</th>
                  <th>{t('finance.date')}</th>
                  <th>{t('finance.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {accountsLoading ? (
                  <TableSkeleton rowCount={10} columnCount={8} />
                ) : paginatedAccounts.length > 0 ? (
                  paginatedAccounts.map((acc) => (
                    <tr key={acc.id}>
                      <td>{acc.id}</td>
                      <td className="fin-branch-cell">{getBranchLabel(acc.branch)}</td>
                      <td className="fin-account-number">{acc.account_number}</td>
                      <td className="fin-signatories-cell">{getTransferMakersDisplay(acc)}</td>
                      <td className="fin-text-green fin-amount-cell">
                        {formatAmount(acc.balance)} UZS
                      </td>
                      <td>
                        <span
                          className={`fin-status-text${acc.status === 'active' ? ' fin-text-green' : ' fin-text-red'}`}
                        >
                          {getAccountStatusLabel(acc.status)}
                        </span>
                      </td>
                      <td className="fin-date-cell">{formatDate(acc.created_at)}</td>
                      <td>
                        <div className="fin-actions">
                          <button
                            className="fin-action-btn fin-action-view"
                            onClick={() => setViewingAccount(acc)}
                            title={t('finance.view')}
                          >
                            <i className="fa-solid fa-eye" />
                          </button>
                          <button
                            className="fin-action-btn fin-action-signatories"
                            onClick={() => setViewingAccount(acc)}
                            title={t('finance.viewSignatories')}
                          >
                            <i className="fa-solid fa-users" />
                          </button>
                          <Protected permission="finance.edit">
                            <button
                              className="fin-action-btn fin-action-edit"
                              onClick={() => openEditAccount(acc)}
                              title={t('finance.edit')}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                          </Protected>
                          <Protected permission="finance.delete">
                            <button
                              className="fin-action-btn fin-action-delete"
                              onClick={() => setDeleteAccountId(acc.id)}
                              title={t('finance.delete')}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </Protected>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyState colSpan={8} message={t('finance.noAccounts')} />
                )}
              </tbody>
            </table>
          </div>

          {/* ── Accounts Pagination ───────────────────────────────── */}
          <FinancePagination
            currentPage={accountPage}
            lastPage={accountLastPage}
            from={(accountPage - 1) * ITEMS_PER_PAGE + 1}
            to={Math.min(accountPage * ITEMS_PER_PAGE, filteredAccounts.length)}
            total={filteredAccounts.length}
            onPageChange={setAccountPage}
            label={t('finance.total')}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TRANSFERS TAB
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'transfers' && (
        <>
          {/* ── View Transfer Detail Modal ───────────────────────── */}
          {viewingTransfer && (
            <div className="fin-modal-overlay" onClick={closeTransferView}>
              <div className="fin-detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="fin-detail-header">
                  <i className="fa-solid fa-right-left fin-detail-icon" />
                  <h3>{t('finance.transferDetails')}</h3>
                </div>
                <div className="fin-detail-rows">
                  <div className="fin-detail-row">
                    <span>{t('finance.id')}</span>
                    <span>{viewingTransfer.id}</span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.senderAccount')}</span>
                    <span className="fin-mono">
                      {viewingTransfer.source_account?.account_number || '-'}
                    </span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.receiverAccount')}</span>
                    <span className="fin-mono">
                      {viewingTransfer.destination_account?.account_number || '-'}
                    </span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.amount')}</span>
                    <span className="fin-text-orange">
                      {formatAmount(viewingTransfer.amount)} UZS
                    </span>
                  </div>
                  <div className="fin-detail-row">
                    <span>{t('finance.status')}</span>
                    <span
                      className={
                        viewingTransfer.status === 'approved'
                          ? 'fin-text-green'
                          : viewingTransfer.status === 'sent'
                            ? 'fin-text-orange'
                            : 'fin-text-red'
                      }
                    >
                      {getTransferStatusLabel(viewingTransfer.status)}
                    </span>
                  </div>
                  {viewingTransfer.sent_by?.full_name && (
                    <div className="fin-detail-row">
                      <span>{t('finance.senderPerson')}</span>
                      <span>{viewingTransfer.sent_by.full_name}</span>
                    </div>
                  )}
                  {viewingTransfer.approved_by?.full_name && (
                    <div className="fin-detail-row">
                      <span>{t('finance.approverPerson')}</span>
                      <span>{viewingTransfer.approved_by.full_name}</span>
                    </div>
                  )}
                  {viewingTransfer.rejected_by?.full_name && (
                    <div className="fin-detail-row">
                      <span>{t('finance.rejecterPerson')}</span>
                      <span>{viewingTransfer.rejected_by.full_name}</span>
                    </div>
                  )}
                  {viewingTransfer.cancelled_by?.full_name && (
                    <div className="fin-detail-row">
                      <span>{t('finance.cancellerPerson')}</span>
                      <span>{viewingTransfer.cancelled_by.full_name}</span>
                    </div>
                  )}
                  {viewingTransfer.notes && (
                    <div className="fin-detail-row">
                      <span>{t('finance.description')}</span>
                      <span>{viewingTransfer.notes}</span>
                    </div>
                  )}
                  <div className="fin-detail-row">
                    <span>{t('finance.createdAt')}</span>
                    <span>{formatDate(viewingTransfer.created_at)}</span>
                  </div>
                </div>

                <div className="fin-modal-actions">
                  <button className="fin-btn-cancel" onClick={closeTransferView}>
                    {t('finance.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                <Protected permission="finance.transfer">
                  <button className="fin-btn-add" onClick={() => setTransferView('select-type')}>
                    {t('finance.createTransfer')}
                  </button>
                </Protected>
              </div>

              {/* Transfers Table */}
              <div className="fin-table-wrapper">
                <table className="fin-table fin-transfers-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={allPageTransfersSelected}
                          onChange={toggleAllPageTransfers}
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
                      paginatedTransfers.map((tr, idx) => (
                        <tr key={tr.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedTransferIds.includes(tr.id)}
                              onChange={() => toggleTransferSelection(tr.id)}
                            />
                          </td>
                          <td>
                            {String((transferPage - 1) * ITEMS_PER_PAGE + idx + 1).padStart(2, '0')}
                          </td>

                          {/* Source Account */}
                          <td>
                            <div className="fin-account-cell">
                              <span className="fin-branch-tag">
                                {(tr.source_account?.account_type_name || '-').toUpperCase()}
                              </span>
                              <span className="fin-acct-tag">
                                {tr.source_account?.account_number || '-'}
                              </span>
                            </div>
                          </td>

                          {/* Destination Account */}
                          <td>
                            <div className="fin-account-cell">
                              <span className="fin-branch-tag">
                                {(tr.destination_account?.account_type_name || '-').toUpperCase()}
                              </span>
                              <span className="fin-acct-tag">
                                {tr.destination_account?.account_number || '-'}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="fin-amount-cell fin-text-orange">
                            {formatAmount(tr.amount)} UZS
                          </td>

                          {/* Responsible Persons */}
                          <td className="fin-responsible-cell">
                            {tr.sent_by?.full_name && (
                              <div className="fin-resp-row">
                                <span className="fin-resp-label">{t('finance.senderPerson')}:</span>
                                <span className="fin-resp-name">{tr.sent_by.full_name}</span>
                                {tr.sent_at && (
                                  <span className="fin-resp-date">{formatDate(tr.sent_at)}</span>
                                )}
                              </div>
                            )}
                            {tr.approved_by?.full_name && (
                              <div className="fin-resp-row">
                                <span className="fin-resp-label">
                                  {t('finance.approverPerson')}:
                                </span>
                                <span className="fin-resp-name">{tr.approved_by.full_name}</span>
                                {tr.approved_at && (
                                  <span className="fin-resp-date">{formatDate(tr.approved_at)}</span>
                                )}
                              </div>
                            )}
                            {tr.rejected_by?.full_name && (
                              <div className="fin-resp-row">
                                <span className="fin-resp-label">
                                  {t('finance.rejecterPerson')}:
                                </span>
                                <span className="fin-resp-name">{tr.rejected_by.full_name}</span>
                                {tr.rejected_at && (
                                  <span className="fin-resp-date">{formatDate(tr.rejected_at)}</span>
                                )}
                              </div>
                            )}
                            {tr.cancelled_by?.full_name && (
                              <div className="fin-resp-row">
                                <span className="fin-resp-label">
                                  {t('finance.cancellerPerson')}:
                                </span>
                                <span className="fin-resp-name">{tr.cancelled_by.full_name}</span>
                                {tr.cancelled_at && (
                                  <span className="fin-resp-date">
                                    {formatDate(tr.cancelled_at)}
                                  </span>
                                )}
                              </div>
                            )}
                            {!tr.sent_by?.full_name &&
                              !tr.approved_by?.full_name &&
                              !tr.rejected_by?.full_name &&
                              !tr.cancelled_by?.full_name &&
                              '-'}
                          </td>

                          {/* Notes */}
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
                            <div className="fin-actions">
                              <button
                                className="fin-action-btn fin-action-view"
                                onClick={() => setViewingTransfer(tr)}
                                title={t('finance.view')}
                              >
                                <i className="fa-solid fa-eye" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
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
                <button className="fin-type-btn" onClick={() => setTransferView('create')}>
                  {t('finance.typeAccountToAccount')}
                </button>
                <button className="fin-type-btn" onClick={() => setTransferView('savings')}>
                  {t('finance.typeAccountToSavings')}
                </button>
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
        </>
      )}
    </section>
  );
};

export default Finances;
