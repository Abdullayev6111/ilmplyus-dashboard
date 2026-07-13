import { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import './attendance.css';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { getLocalized } from '../../utils/getLocalized';
import { useOptions } from '../../hooks/useOptions';
import { useEmployees } from '../../hooks/useSharedQueries';
import type { FlatAttendanceRecord, AttendanceBranch } from '../../types/attendance.types';
import { toStatusCode, statusClass, shortTime, type StatusCode } from './attendance.utils';

const todayISO = () => new Date().toISOString().slice(0, 10);

interface EmployeeRow {
  id: number;
  employee: string;
  position: string;
  branch: AttendanceBranch | null;
  branchId?: number;
  firstIn: string;
  lastOut: string;
  statuses: StatusCode[];
}

const AttendancePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState('');
  const [branchId, setBranchId] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  // Default: oxirgi qo'shilgan xodim birinchi
  const [sortAsc, setSortAsc] = useState(false);

  const { data: branchOptions } = useOptions('branches');
  const { data: employeeOptions } = useEmployees();

  const { data, isLoading } = useQuery<{ data: FlatAttendanceRecord[] }>({
    queryKey: ['attendances', month],
    queryFn: async () => {
      const { data } = await API.get('/attendances', { params: { month, per_page: 1000 } });
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // Har bir xodim uchun bitta qator: tanlangan kundagi birinchi kirish va oxirgi chiqish
  const rows = useMemo(() => {
    const byEmployee: Record<number, EmployeeRow> = {};

    // Avval barcha xodimlarni qatorga qo'shamiz — davomati yo'qlari ham ko'rinsin
    (employeeOptions || []).forEach((e) => {
      byEmployee[e.id] = {
        id: e.id,
        employee: e.label,
        position: '',
        branch: null,
        firstIn: '',
        lastOut: '',
        statuses: [],
      };
    });

    (data?.data || [])
      .filter((r) => (date ? r.date === date : true))
      .forEach((r) => {
        const row = (byEmployee[r.employee_id] ??= {
          id: r.employee_id,
          employee: r.employee,
          position: '',
          branch: null,
          firstIn: '',
          lastOut: '',
          statuses: [],
        });

        row.position ||= r.position || '';
        row.branch ??= r.branch || null;
        row.branchId ??= r.branch_id;

        const time = shortTime(r.time || r.check_in);
        if (time) {
          if (r.type === 'out') {
            if (!row.lastOut || time > row.lastOut) row.lastOut = time;
          } else {
            if (!row.firstIn || time < row.firstIn) row.firstIn = time;
          }
        }

        (Array.isArray(r.status) ? r.status : []).forEach((s) => {
          const code = toStatusCode(s);
          if (code && !row.statuses.includes(code)) row.statuses.push(code);
        });
      });

    return Object.values(byEmployee)
      .filter((row) => {
        const matchSearch = search
          ? row.employee.toLowerCase().includes(search.toLowerCase())
          : true;
        const matchBranch = branchId ? String(row.branchId) === branchId : true;
        return matchSearch && matchBranch;
      })
      .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id));
  }, [data?.data, employeeOptions, date, search, branchId, sortAsc]);

  const toggleAll = (checked: boolean) => setSelected(checked ? rows.map((r) => r.id) : []);
  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section className="attendance-page container">
      <div className="attendance-filters">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setDate('');
          }}
        />

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">{t('attendance.table.branch')}</option>
          {(branchOptions || []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>

        <input
          placeholder={t('attendance.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* <div className="legend">
          <div className="legend-item">
            <b className="status-plus">+</b> {t('attendance.legend.present')}
          </div>
          <div className="legend-item">
            <b className="status-nb">NB</b> {t('attendance.legend.absentNoExcuse')}
          </div>
          <div className="legend-item">
            <b className="status-s">S</b> {t('attendance.legend.absentWithExcuse')}
          </div>
          <div className="legend-item">
            <b className="status-f">F</b> {t('attendance.legend.noUniform')}
          </div>
          <div className="legend-item">
            <b className="status-k">K</b> {t('attendance.legend.late')}
          </div>
        </div> */}
      </div>

      <div className="attendance-table-wrapper">
        <table className="attendance-list-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.length === rows.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th>{t('attendance.table.fullName')}</th>
              <th>{t('attendance.table.position')}</th>
              <th>{t('attendance.table.status')}</th>
              <th>{t('attendance.table.branch')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={7} />
            ) : rows.length > 0 ? (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(r.id)}
                      onChange={() => toggleOne(r.id)}
                    />
                  </td>
                  <td>{r.id}</td>
                  <td>
                    <button
                      className="employee-link"
                      onClick={() => navigate(`/attendance/${r.id}`)}
                    >
                      {r.employee}
                    </button>
                  </td>
                  <td>{r.position || '-'}</td>
                  <td>
                    <div className="type-cell">
                      {r.firstIn ? (
                        <span className="type-badge type-in">
                          {t('attendance.type.in')} <b>{r.firstIn}</b>
                        </span>
                      ) : null}
                      {r.lastOut ? (
                        <span className="type-badge type-out">
                          {t('attendance.type.out')} <b>{r.lastOut}</b>
                        </span>
                      ) : null}
                      {!r.firstIn && !r.lastOut && <span className="type-badge type-none">-</span>}
                      {r.statuses.length > 0 && (
                        <span className="status-codes">
                          {r.statuses.map((s) => (
                            <b key={s} className={statusClass(s)}>
                              {s}
                            </b>
                          ))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{r.branch ? getLocalized(r.branch, 'name', i18n.language) : '-'}</td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={7} message={t('attendance.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AttendancePage;
