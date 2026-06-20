import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FilterDropdown from '../../components/FilterDropdown';
import { EMPTY_FILTER } from '@/components/FilterDropdown/Filterdropdown.constants';
import type {
  FilterState,
  StudentGender,
} from '@/components/FilterDropdown/Filterdropdown.constants';
import { RegistrationModal } from '@/components/RegistrationModal';
import { DeleteConfirmationModal } from '@/components/RegistrationModal/DeleteConfirmModal';
import { useDeleteMutation } from '@/hooks/useMutations';
import { fetchLids, deleteLid, type PaginatedLids } from '@/pages/lid/lid.service';
import { getName, formatGender, getSourceKey, getSourceLabel } from '../../types/lid.types';
import { useTranslation } from 'react-i18next';
import { Protected } from '../../components/Protected';
import type { Lid } from '../../types/lid.types';
import './registration.css';

type PageSize = 5 | 10 | 20 | 50;
const PAGE_SIZE_OPTIONS: PageSize[] = [5, 10, 20, 50];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}.${month}.${year}`;
}

function applyClientFilters(
  lids: Lid[],
  search: string,
  filters: FilterState,
  lang: string,
): Lid[] {
  const q = search.trim().toLowerCase();

  return lids.filter((s) => {
    const courseName = getName(s.course, lang);
    const groupName = getName(s.group, lang);
    const branchName = getName(s.branch, lang);
    const genderLabel = formatGender(s.gender) as StudentGender;

    if (q) {
      const fullName = `${s.first_name} ${s.last_name}`;
      const haystack =
        `${fullName} ${s.phone} ${courseName} ${groupName} ${branchName}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.sources.length > 0 && (!s.source_id || !filters.sources.includes(s.source_id)))
      return false;
    if (filters.genders.length > 0 && !filters.genders.includes(genderLabel)) return false;

    // Direction filtering (courses and levels)
    if (filters.courses.length > 0) {
      const isCourseSelected = s.course_id && filters.courses.includes(s.course_id);
      const isLevelSelected = s.level_id && filters.levels.includes(s.level_id);

      // If they selected a specific level, they MUST match that level
      if (filters.levels.length > 0) {
        if (!isLevelSelected) return false;
      } else {
        // If no levels selected but course is selected, they MUST match the course
        if (!isCourseSelected) return false;
      }
    } else if (filters.levels.length > 0) {
      // Just levels selected
      if (!s.level_id || !filters.levels.includes(s.level_id)) return false;
    }

    // Date filtering
    if (filters.date) {
      const lidDate = s.created_at ? new Date(s.created_at) : new Date();
      const lidDateString = lidDate.toISOString().split('T')[0];
      if (lidDateString !== filters.date) return false;
    }

    return true;
  });
}

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
      {pages?.map((page, idx) =>
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

const Registration = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<number | undefined>(undefined);
  const [idSortOrder, setIdSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading, isError } = useQuery<PaginatedLids>({
    queryKey: ['lids', currentPage, pageSize],
    queryFn: () => fetchLids({ page: currentPage, per_page: pageSize }),
  });

  const deleteMutation = useDeleteMutation(deleteLid, [['lids']]);

  const lids: Lid[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.last_page ?? 1;

  const filteredData = useMemo(() => {
    const filtered = applyClientFilters(lids, search, filters, lang);
    return [...filtered].sort((a, b) => (idSortOrder === 'asc' ? a.id - b.id : b.id - a.id));
  }, [lids, search, filters, lang, idSortOrder]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleFiltersChange = useCallback((next: FilterState) => {
    setFilters(next);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value) as PageSize);
    setCurrentPage(1);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditId(undefined);
  }, []);

  const handleOpenEdit = useCallback((id: number) => {
    setEditId(id);
    setIsModalOpen(true);
  }, []);

  const handleOpenDelete = useCallback((id: number) => {
    setDeleteId(id);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setDeleteId(undefined);
  }, []);

  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);
  const showPagination = totalPages > 1;

  return (
    <>
      <section className="registration container">
        <div className="registration-top">
          <h1>{t('registration.newRegistrated')}</h1>
          <div className="registration-top__actions">
            <div
              className="registration-top__search"
              role="search"
              aria-label="O‘quvchilarni qidirish"
            >
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                placeholder={t('registration.inputPlaceholder')}
                value={search}
                onChange={handleSearchChange}
                aria-label="Qidiruv"
              />
            </div>
            <FilterDropdown filters={filters} onChange={handleFiltersChange} />
          </div>
        </div>

        <div className="dashboard-bottom">
          <div className="db-header">
            <h2 className="db-header__title">{t('registration.tableTitle')}</h2>
            <div className="db-header__controls">
              <label htmlFor="page-size-select" className="db-select__label">
                {t('registration.rowsLabel')}:
              </label>
              <select
                id="page-size-select"
                className="db-select"
                value={pageSize}
                onChange={handlePageSizeChange}
                aria-label="Sahifadagi qatorlar soni"
              >
                {PAGE_SIZE_OPTIONS?.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="db-table-wrapper"
            role="region"
            aria-label="Yangi ‘quvchilar jadvali"
            tabIndex={0}
          >
            <table className="db-table">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="th-sortable"
                    onClick={() => setIdSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    aria-sort={idSortOrder === 'asc' ? 'ascending' : 'descending'}
                  >
                    {t('registration.colLidId')}{' '}
                    <i
                      className={`fa-solid fa-sort-${idSortOrder === 'asc' ? 'up' : 'down'}`}
                      aria-hidden="true"
                    />
                  </th>
                  <th scope="col">{t('registration.colFish')}</th>
                  <th scope="col">{t('registration.colDirection')}</th>
                  <th scope="col">{t('registration.colGroup')}</th>
                  <th scope="col">{t('registration.colGender')}</th>
                  <th scope="col">{t('registration.colBranch')}</th>
                  <th scope="col">{t('registration.colSource')}</th>
                  <th scope="col">{t('registration.colDate')}</th>
                  <th scope="col">{t('registration.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="db-empty-state" aria-live="polite">
                      <div className="db-empty-state__inner">
                        <p>{t('registration.loading')}</p>
                      </div>
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={9} className="db-empty-state" aria-live="polite">
                      <div className="db-empty-state__inner">
                        <p>{t('registration.error')}</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((student: Lid) => {
                    const fish = [student.last_name, student.first_name, student.father_name]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <tr key={student.id} className="db-table__row">
                        <td>
                          <span className="db-id-cell">{student.id}</span>
                        </td>
                        <td>
                          <span className="db-fish-cell">{fish}</span>
                        </td>
                        <td>
                          <div className="db-direction-cell">
                            <span className="db-direction-cell__dot" aria-hidden="true" />
                            <span className="db-direction-cell__text">
                              {getName(student.course, lang)} {getName(student.level, lang)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="db-group-cell">{getName(student.group, lang)}</span>
                        </td>
                        <td>
                          <span className="db-gender-cell">{formatGender(student.gender)}</span>
                        </td>
                        <td>
                          <span className="db-branch-cell">{getName(student.branch, lang)}</span>
                        </td>
                        <td>
                          <span
                            className={`db-source-badge db-source-badge--${getSourceKey(student.source)}`}
                          >
                            {getSourceLabel(student.source, lang)}
                          </span>
                        </td>
                        <td>
                          <span className="db-date-cell">{formatDate(student.created_at)}</span>
                        </td>
                        <td>
                          <div className="db-actions-cell">
                            <Protected
                              permission="lids.edit"
                              scopePermissions={student.permissions}
                            >
                              <button
                                type="button"
                                className="db-action-btn"
                                onClick={() => handleOpenEdit(student.id)}
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                            </Protected>
                            <Protected permission="students.edit">
                              <button
                                type="button"
                                className="db-action-btn"
                                aria-label={`${fish}ni arxivlash`}
                              >
                                <i className="fa-solid fa-box-archive" />
                              </button>
                            </Protected>
                            <Protected permission="lids.delete">
                              <button
                                type="button"
                                className="db-action-btn db-action-btn--danger"
                                aria-label={`${fish}ni o‘chirish`}
                                onClick={() => handleOpenDelete(student.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            </Protected>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="db-empty-state" aria-live="polite">
                      <div className="db-empty-state__inner">
                        <i
                          className="fa-solid fa-magnifying-glass db-empty-state__icon"
                          aria-hidden="true"
                        />
                        <p>{t('registration.resultsNotFound')}</p>
                        <span>{t('registration.changeFilters')}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {showPagination && (
            <div className="db-pagination">
              <span className="db-pagination__info">
                {t('registration.paginationAll')}: {total}
                {t('registration.paginationFrom')} {startItem}-{endItem}
                {t('registration.paginationTo')}
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </section>

      {isModalOpen && <RegistrationModal onClose={handleCloseModal} editId={editId} />}

      {deleteId != null && <DeleteConfirmationModal lidId={deleteId} onClose={handleCloseDelete} />}
    </>
  );
};

export default Registration;
