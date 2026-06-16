import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { API } from '../../api/api';
import '../users/users.css';
import './teachers.css';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../utils/getLocalized';
import type { Contract, Branch } from '../../types';

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ru-RU');
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
  const { t } = useTranslation();
  const pages = useMemo<(number | '...')[]>(() => {
    if (lastPage <= 6) return Array.from({ length: lastPage }, (_, i) => i + 1);
    return [1, 2, 3, '...', lastPage];
  }, [lastPage]);

  return (
    <div className="cp-pagination">
      <span className="cp-pagination__info">
        {t('teachers.paginationInfo', { total, from, to })}
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
            <span key={`el-${i}`} className="cp-pagination__ellipsis">
              ...
            </span>
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
  branchName: string;
}

function TableRow({ row, isSelected, onToggle, branchName }: TableRowProps) {
  const { t } = useTranslation();
  const emp = row.employee;

  const isActive = row.status === 'active';
  const statusColor = isActive ? '#16a34a' : '#dc2626';
  const statusBg = isActive ? '#dcfce7' : '#fef2f2';

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
        {emp?.full_name ||
          `${emp?.last_name ?? ''} ${emp?.first_name ?? ''} ${emp?.middle_name ?? ''}`.trim() ||
          '-'}
      </td>
      <td>{branchName || '-'}</td>
      <td>{emp?.phone || '-'}</td>
      <td>
        <span
          style={{
            background: statusBg,
            color: statusColor,
            padding: '3px 10px',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {isActive ? t('teachers.statusActive') : t('teachers.statusInactive')}
        </span>
      </td>
      <td>{formatDate(row.created_at)}</td>
      <td>{formatDate(row.updated_at)}</td>
      <td>
        <div className="actions">
          <button type="button" className="user-edit-btn" title={t('teachers.editTooltip')}>
            <i className="fa-solid fa-pen" />
          </button>
          <button type="button" className="user-delete-btn" title={t('teachers.deleteTooltip')}>
            <i className="fa-solid fa-trash" />
          </button>
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
  branchMap: Map<number, string>;
  sortAsc: boolean;
  onToggleSort: () => void;
}

function Table({
  rows,
  selectedIds,
  onToggleOne,
  onToggleAll,
  branchMap,
  sortAsc,
  onToggleSort,
}: TableProps) {
  const { t } = useTranslation();
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = rows.some((r) => selectedIds.has(r.id)) && !allSelected;
  const cbRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cbRef.current) cbRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <div className="users-table-wrapper">
      <table className="users-table">
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
              {t('teachers.tableId')} {sortAsc ? '↑' : '↓'}
            </th>
            <th>{t('teachers.tableFullName')}</th>
            <th>{t('teachers.tableBranch')}</th>
            <th>{t('teachers.tablePhone')}</th>
            <th>{t('teachers.tableStatus')}</th>
            <th>{t('teachers.tableCreated')}</th>
            <th>{t('teachers.tableUpdated')}</th>
            <th>{t('teachers.tableActions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              isSelected={selectedIds.has(row.id)}
              onToggle={onToggleOne}
              branchName={branchMap.get(row.employee?.branch_id ?? 0) ?? '-'}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Teachers() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const {
    data: contractsData,
    isLoading,
    isError,
  } = useQuery<Contract[]>({
    queryKey: ['contracts', 'teachers'],
    queryFn: async () => {
      const { data } = await API.get('/contracts');
      const list: Contract[] = Array.isArray(data) ? data : (data?.data ?? []);
      return list.filter((c) => c.department_id === 1);
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get('/branches');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    staleTime: 1000 * 60 * 30,
  });

  const branchMap = useMemo(() => {
    const map = new Map<number, string>();
    (branches ?? []).forEach((b) => map.set(b.id, getLocalized(b, 'name', lang) || b.name_uz));
    return map;
  }, [branches, lang]);

  const sortedData = useMemo(
    () => [...(contractsData ?? [])].sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id)),
    [contractsData, sortAsc],
  );

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safePage]);

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

  return (
    <section className="users container">
      <h1 className="main-title">{t('teachers.title')}</h1>

      <div className="users-filters">
        <button
          type="button"
          className="add-new-user"
          onClick={() => navigate('/contracts/create')}
        >
          {t('teachers.add')}
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#7a8fa6' }}>
          {t('teachers.loading')}
        </div>
      )}
      {isError && (
        <div style={{ padding: 40, textAlign: 'center', color: '#e70a0a' }}>
          {t('teachers.error')}
        </div>
      )}
      {!isLoading && !isError && sortedData.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#7a8fa6' }}>
          {t('teachers.noData')}
        </div>
      )}

      {!isLoading && !isError && sortedData.length > 0 && (
        <Table
          rows={paginatedData}
          selectedIds={selectedIds}
          onToggleOne={handleToggleOne}
          onToggleAll={handleToggleAll}
          branchMap={branchMap}
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
    </section>
  );
}
