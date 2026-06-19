import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import { getLocalized } from '../../utils/getLocalized';
import AddCourseModal from './AddCourseModal';
import '../payments/payments.css';
import './course-prices.css';
import { useTranslation } from 'react-i18next';
import type { CoursePrice, CoursePriceListResponse, CoursePricePayload } from '../../types';
import { Protected } from '../../components/Protected';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
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
  row: CoursePrice;
  isSelected: boolean;
  onToggle: (id: number) => void;
  onEdit: (row: CoursePrice) => void;
  onDelete: (id: number) => void;
}

function TableRow({ row, isSelected, onToggle, onEdit, onDelete }: TableRowProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const pctColor = row.percentage > 0 ? '#27ae60' : row.percentage < 0 ? '#e70a0a' : '#333';

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
      <td>{getLocalized(row.course, 'name', lang)}</td>
      <td>{getLocalized(row.branch, 'name', lang)}</td>
      <td>
        <span
          style={{
            background: '#e8f0fe',
            color: '#003366',
            padding: '3px 10px',
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {getLocalized(row.level, 'name', lang)}
        </span>
      </td>
      <td>{formatNarx(row.old_price)}</td>
      <td>{formatNarx(row.new_price)}</td>
      <td>{row.lessons_count}</td>
      <td>{formatNarx(row.lesson_price)}</td>
      <td style={{ color: pctColor, fontWeight: 600 }}>
        {row.percentage > 0 ? '+' : ''}
        {row.percentage}%
      </td>
      <td>{row.start_date}</td>
      <td>{formatDate(row.created_at)}</td>
      <td>
        <div className="actions">
          <Protected permission="course_prices.edit">
            <button
              type="button"
              className="user-edit-btn"
              title={t('coursePrices.editTooltip')}
              onClick={() => onEdit(row)}
            >
              <i className="fa-solid fa-pen" />
            </button>
          </Protected>
          <Protected permission="course_prices.delete">
            <button
              type="button"
              className="payment-delete-btn"
              title={t('coursePrices.deleteTooltip')}
              onClick={() => onDelete(row.id)}
            >
              <i className="fa-solid fa-trash" />
            </button>
          </Protected>
        </div>
      </td>
    </tr>
  );
}

interface TableProps {
  rows: CoursePrice[];
  selectedIds: Set<number>;
  onToggleOne: (id: number) => void;
  onToggleAll: () => void;
  onEdit: (row: CoursePrice) => void;
  onDelete: (id: number) => void;
  sortAsc: boolean;
  onToggleSort: () => void;
}

function Table({
  rows,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onEdit,
  onDelete,
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
              {t('coursePrices.tableId')} {sortAsc ? '↑' : '↓'}
            </th>
            <th>{t('coursePrices.tableCourseName')}</th>
            <th>{t('coursePrices.tableBranch')}</th>
            <th>{t('coursePrices.tableLevel')}</th>
            <th>{t('coursePrices.tableOldPrice')}</th>
            <th>{t('coursePrices.tableNewPrice')}</th>
            <th>{t('coursePrices.tableLessonsCount')}</th>
            <th>{t('coursePrices.tableLessonPrice')}</th>
            <th>{t('coursePrices.tableChange')}</th>
            <th>{t('coursePrices.tableChangeDate')}</th>
            <th>{t('coursePrices.tableCreatedDate')}</th>
            <th>{t('coursePrices.tableActions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              row={row}
              isSelected={selectedIds.has(row.id)}
              onToggle={onToggleOne}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CoursePrices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<CoursePrice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const { data, isLoading, isError } = useQuery<CoursePriceListResponse>({
    queryKey: ['course_prices', currentPage],
    queryFn: () => API.get('/course_prices', { params: { page: currentPage } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CoursePricePayload) =>
      API.post('/course_prices', payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course_prices'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CoursePricePayload }) =>
      API.put(`/course_prices/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course_prices'] });
      setEditItem(null);
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/course_prices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course_prices'] });
    },
  });

  const rows = useMemo(() => {
    const arr = data?.data ?? [];
    return [...arr].sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id));
  }, [data, sortAsc]);

  const paginationMeta = data
    ? {
        current_page: data.current_page,
        last_page: data.last_page,
        from: data.from,
        to: data.to,
        total: data.total,
      }
    : null;

  const handleSave = useCallback(
    (payload: CoursePricePayload) => {
      if (editItem) {
        updateMutation.mutate({ id: editItem.id, payload });
      } else {
        createMutation.mutate(payload);
      }
    },
    [editItem, createMutation, updateMutation],
  );

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
      const allSel = rows.every((r) => prev.has(r.id));
      const next = new Set(prev);
      rows.forEach((r) => (allSel ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }, [rows]);

  const handleEdit = useCallback((row: CoursePrice) => {
    setEditItem(row);
    setIsModalOpen(true);
  }, []);

  const handleDeleteOne = useCallback((id: number) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setDeleteTargetId(null);
    setShowDeleteModal(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTargetId !== null) {
      deleteMutation.mutate(deleteTargetId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTargetId);
        return next;
      });
    } else {
      selectedIds.forEach((id) => deleteMutation.mutate(id));
      setSelectedIds(new Set());
    }
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  }, [deleteTargetId, selectedIds, deleteMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const deleteCount = deleteTargetId !== null ? 1 : selectedIds.size;

  return (
    <section className="payments container">
      <h1 className="main-title">{t('coursePrices.mainTitle')}</h1>

      <div className="payments-filters">
        <Protected permission="course_prices.create">
          <button
            type="button"
            className="add-new-payment"
            onClick={() => {
              setEditItem(null);
              setIsModalOpen(true);
            }}
          >
            {t('coursePrices.add')}
          </button>
        </Protected>
        <Protected permission="course_prices.delete">
          <button
            type="button"
            className="delete-all"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
          >
            {t('coursePrices.delete')}
          </button>
        </Protected>
      </div>

      {isLoading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#7a8fa6' }}>
          {t('coursePrices.loading')}
        </div>
      )}
      {isError && (
        <div style={{ padding: 40, textAlign: 'center', color: '#e70a0a' }}>
          {t('coursePrices.error')}
        </div>
      )}
      {!isLoading && !isError && rows.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#7a8fa6' }}>
          {t('coursePrices.noData')}
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <Table
          rows={rows}
          selectedIds={selectedIds}
          onToggleOne={handleToggleOne}
          onToggleAll={handleToggleAll}
          onEdit={handleEdit}
          onDelete={handleDeleteOne}
          sortAsc={sortAsc}
          onToggleSort={() => setSortAsc((p) => !p)}
        />
      )}

      {!isLoading && !isError && paginationMeta && paginationMeta.total > 0 && (
        <Pagination
          currentPage={paginationMeta.current_page}
          lastPage={paginationMeta.last_page}
          from={paginationMeta.from}
          to={paginationMeta.to}
          total={paginationMeta.total}
          onPageChange={setCurrentPage}
        />
      )}

      {isModalOpen && (
        <AddCourseModal
          coursePrices={data?.data ?? []}
          editItem={editItem}
          isSaving={isSaving}
          onClose={() => {
            setIsModalOpen(false);
            setEditItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3 className="modal-title">{t('coursePrices.deleteConfirmTitle')}</h3>
            <p style={{ fontSize: 14, color: '#333' }}>
              {t('coursePrices.deleteConfirmText', { count: deleteCount })}
            </p>
            <div className="modal-actions">
              <button type="button" className="danger" onClick={confirmDelete}>
                {t('coursePrices.delete')}
              </button>
              <button
                type="button"
                className="cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetId(null);
                }}
              >
                {t('coursePrices.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
