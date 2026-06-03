import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import '../payments/payments.css';
import './contracts.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import ContractDetail from './ContractDetail';
import ContractsCreate from './ContractsCreate';
import type { Contract } from '../../types';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function formatNarx(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? String(val) : n.toLocaleString('uz-UZ');
}

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, lastPage, from, to, total, onPageChange }: PaginationProps) {
  const pages = useMemo<(number | '...')[]>(() => {
    if (lastPage <= 6) return Array.from({ length: lastPage }, (_, i) => i + 1);
    return [1, 2, 3, '...', lastPage];
  }, [lastPage]);

  return (
    <div className="cp-pagination">
      <span className="cp-pagination__info">
        Jami: {total} ta, {from}-{to} ko'rsatilmoqda
      </span>
      <div className="cp-pagination__controls">
        <button
          type="button"
          className="cp-pagination__btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`el-${i}`} className="cp-pagination__ellipsis">...</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`cp-pagination__btn${currentPage === p ? ' cp-pagination__btn--active' : ''}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="cp-pagination__btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === lastPage}
        >
          ›
        </button>
      </div>
    </div>
  );
}

interface TableRowProps {
  row: Contract;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onView: (row: Contract) => void;
  onEdit: (row: Contract) => void;
  onDelete: (row: Contract) => void;
  onTerminate: (row: Contract) => void;
}

function TableRow({ row, isSelected, onToggle, onView, onEdit, onDelete, onTerminate }: TableRowProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const emp = row.employee;

  const isActive = row.status === 'active';
  const statusColor = isActive ? '#16a34a' : '#dc2626';
  const statusBg = isActive ? '#dcfce7' : '#fef2f2';
  const statusLabel = isActive ? t('contracts.statusActive') : t('contracts.statusInactive');

  return (
    <tr style={isSelected ? { background: '#eef4ff' } : undefined}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(row.id)}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#003366' }}
        />
      </td>
      <td style={{ fontWeight: 600, color: '#003366' }}>{row.id}</td>
      <td style={{ textAlign: 'left' }}>
        {emp?.full_name || `${emp?.last_name ?? ''} ${emp?.first_name ?? ''} ${emp?.middle_name ?? ''}`.trim() || '-'}
      </td>
      <td>{emp?.phone || '-'}</td>
      <td>{getLocalized(row.department, 'name', lang) || '-'}</td>
      <td style={{ fontWeight: 600 }}>#{row.contract_number}</td>
      <td>
        <span style={{ background: statusBg, color: statusColor, padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {statusLabel}
        </span>
      </td>
      <td>{formatDate(row.contract_start_date)}</td>
      <td>{formatDate(row.contract_end_date)}</td>
      <td>
        <div className="actions">
          <button
            type="button"
            style={{ color: '#fe9100', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}
            title={t('contracts.viewTooltip')}
            onClick={() => onView(row)}
          >
            <i className="fa-regular fa-eye" />
          </button>
          <button
            type="button"
            style={{ color: '#1a73e8', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}
            title={t('contracts.editTooltip')}
            onClick={() => onEdit(row)}
          >
            <i className="fa-regular fa-pen-to-square" />
          </button>
          <button
            type="button"
            className="payment-delete-btn"
            title={t('contracts.deleteTooltip')}
            onClick={() => onDelete(row)}
          >
            <i className="fa-regular fa-trash-can" />
          </button>
          {isActive && (
            <button
              type="button"
              style={{ color: '#eab308', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}
              title={t('contracts.terminateTooltip')}
              onClick={() => onTerminate(row)}
            >
              <i className="fa-solid fa-ban" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface TableProps {
  rows: Contract[];
  selectedIds: Set<number>;
  onToggleOne: (id: number) => void;
  onToggleAll: () => void;
  onView: (row: Contract) => void;
  onEdit: (row: Contract) => void;
  onDelete: (row: Contract) => void;
  onTerminate: (row: Contract) => void;
  sortAsc: boolean;
  onToggleSort: () => void;
}

function Table({ rows, selectedIds, onToggleOne, onToggleAll, onView, onEdit, onDelete, onTerminate, sortAsc, onToggleSort }: TableProps) {
  const { t } = useTranslation();
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id)) && !allSelected;
  const cbRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cbRef.current) cbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <div className="payments-table-wrapper">
      <table className="payments-table">
        <thead>
          <tr>
            <th style={{ width: 46 }}>
              <input
                ref={cbRef}
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#003366' }}
              />
            </th>
            <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={onToggleSort}>
              {t('contracts.tableId')} {sortAsc ? '↑' : '↓'}
            </th>
            <th>{t('contracts.tableFullName')}</th>
            <th>{t('contracts.tablePhone')}</th>
            <th>{t('contracts.tableDepartment')}</th>
            <th>{t('contracts.tableContractNo')}</th>
            <th>{t('contracts.tableStatus')}</th>
            <th>{t('contracts.tableStartDate')}</th>
            <th>{t('contracts.tableEndDate')}</th>
            <th>{t('contracts.tableActions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              isSelected={selectedIds.has(row.id)}
              onToggle={onToggleOne}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onTerminate={onTerminate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ConfirmAction = { type: 'delete' | 'terminate'; row: Contract } | null;

export default function Contracts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editContract, setEditContract] = useState<{ employeeId: number; contractId: number } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  useEffect(() => {
    const isOpen = !!viewContract || !!confirmAction;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [viewContract, confirmAction]);

  const { data: contracts, isLoading, isError } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data } = await API.get('/contracts');
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ employeeId, contractId }: { employeeId: number; contractId: number }) =>
      API.delete(`/employees/${employeeId}/contracts/${contractId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });

  const terminateMutation = useMutation({
    mutationFn: ({ employeeId, contractId }: { employeeId: number; contractId: number }) =>
      API.patch(`/employees/${employeeId}/contracts/${contractId}/terminate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  });

  const sortedData = useMemo(() => {
    if (!contracts) return [];
    return [...contracts].sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
  }, [contracts, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage, pageSize]);

  const from = sortedData.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = Math.min(safePage * pageSize, sortedData.length);

  const handleToggleOne = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSel = paginatedData.every((r) => prev.has(r.id));
      const next = new Set(prev);
      paginatedData.forEach((r) => (allSel ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }, [paginatedData]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const first = sortedData.find((r) => selectedIds.has(r.id));
    if (first) setConfirmAction({ type: 'delete', row: first });
  }, [selectedIds, sortedData]);

  const handleConfirm = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete') {
      if (selectedIds.size > 1) {
        sortedData
          .filter((r) => selectedIds.has(r.id))
          .forEach((r) => deleteMutation.mutate({ employeeId: r.employee.id, contractId: r.id }));
        setSelectedIds(new Set());
      } else {
        const row = confirmAction.row;
        deleteMutation.mutate({ employeeId: row.employee.id, contractId: row.id });
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(row.id); return next; });
      }
    } else {
      const row = confirmAction.row;
      terminateMutation.mutate({ employeeId: row.employee.id, contractId: row.id });
    }
    setConfirmAction(null);
  }, [confirmAction, selectedIds, sortedData, deleteMutation, terminateMutation]);

  if (isCreating) {
    return <ContractsCreate onCancel={() => setIsCreating(false)} onSuccess={() => setIsCreating(false)} />;
  }

  if (editContract) {
    return (
      <ContractsCreate
        employeeId={editContract.employeeId}
        contractId={editContract.contractId}
        onCancel={() => setEditContract(null)}
        onSuccess={() => setEditContract(null)}
      />
    );
  }

  return (
    <section className="payments container">
      <h1 className="main-title">{t('contracts.mainTitle')}</h1>

      <div className="payments-filters">
        <button type="button" className="add-new-payment" onClick={() => setIsCreating(true)}>
          {t('contracts.add')}
        </button>
        <button
          type="button"
          className="delete-all"
          onClick={handleDeleteSelected}
          disabled={selectedIds.size === 0}
        >
          {t('contracts.delete')}
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#7a8fa6' }}>{t('contracts.loading')}</div>
      )}
      {isError && (
        <div style={{ padding: 40, textAlign: 'center', color: '#e70a0a' }}>{t('contracts.error')}</div>
      )}
      {!isLoading && !isError && sortedData.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#7a8fa6' }}>{t('contracts.noData')}</div>
      )}

      {!isLoading && !isError && sortedData.length > 0 && (
        <Table
          rows={paginatedData}
          selectedIds={selectedIds}
          onToggleOne={handleToggleOne}
          onToggleAll={handleToggleAll}
          onView={setViewContract}
          onEdit={(row) => setEditContract({ employeeId: row.employee.id, contractId: row.id })}
          onDelete={(row) => { setSelectedIds(new Set([row.id])); setConfirmAction({ type: 'delete', row }); }}
          onTerminate={(row) => setConfirmAction({ type: 'terminate', row })}
          sortAsc={sortAsc}
          onToggleSort={() => setSortAsc((p) => !p)}
        />
      )}

      {!isLoading && !isError && sortedData.length > pageSize && (
        <Pagination
          currentPage={safePage}
          lastPage={totalPages}
          from={from}
          to={to}
          total={sortedData.length}
          onPageChange={setCurrentPage}
        />
      )}

      {confirmAction && (
        <div className="ct-modal-overlay">
          <div className="ct-modal ct-modal--small">
            <h3 className="ct-modal-title">
              {confirmAction.type === 'delete'
                ? t('contracts.deleteConfirmTitle')
                : t('contracts.terminateConfirmTitle')}
            </h3>
            <p style={{ fontSize: 14, color: '#333' }}>
              {confirmAction.type === 'delete'
                ? t('contracts.deleteConfirmText')
                : t('contracts.terminateConfirmText')}
            </p>
            <div className="ct-modal-actions">
              <button type="button" className="ct-cancel-btn" onClick={() => setConfirmAction(null)}>
                {t('contracts.cancel')}
              </button>
              <button type="button" className="ct-danger-btn" onClick={handleConfirm}>
                {t('contracts.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewContract && (
        <ContractDetail contract={viewContract} onClose={() => setViewContract(null)} />
      )}
    </section>
  );
}
