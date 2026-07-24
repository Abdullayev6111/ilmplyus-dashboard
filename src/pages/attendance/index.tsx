import { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import './attendance.css';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { getLocalized } from '../../utils/getLocalized';
import { useOptions, type OptionItem } from '../../hooks/useOptions';
import { useEmployees } from '../../hooks/useSharedQueries';
import { usePermission } from '../../hooks/usePermission';
import type { FlatAttendanceRecord, AttendanceBranch } from '../../types/attendance.types';
import {
  toStatusCode,
  statusClass,
  statusLabelKey,
  shortTime,
  monthRange,
  type StatusCode,
} from './attendance.utils';

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Bo'lim tablari — har biri `attendance.department.{slug}.view` ruxsati bilan ochiladi.
 * Slug'lar backend permission nomlaridagi qiymatlar (pedagog/mamuriy/texnik/sotuv);
 * bo'limning o'zi esa /options/departments dagi code yoki nomi orqali topiladi.
 */
type DeptSlug = 'pedagog' | 'mamuriy' | 'texnik' | 'sotuv';

const DEPT_TABS: { slug: DeptSlug; keywords: string[] }[] = [
  { slug: 'pedagog', keywords: ['pedagog', 'педагог'] },
  { slug: 'mamuriy', keywords: ['mamuriy', 'маъмурий', 'мамурий', 'админ', 'administrat'] },
  { slug: 'texnik', keywords: ['texnik', 'техник', 'technic'] },
  { slug: 'sotuv', keywords: ['sotuv', 'сотув', 'прода', 'sales'] },
];

/** Apostrof variantlarini tashlab, kichik harfga o'tkazadi (ma'muriy → mamuriy). */
const normalizeName = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[ʼ’‘'`ʻ]/g, '');

/** Option ichidan bo'lim id'larini yig'adi: department_id, department.id yoki departments[].id */
const extractDeptIds = (src: Record<string, unknown> | null | undefined): number[] => {
  if (!src) return [];
  const ids = new Set<number>();
  if (typeof src.department_id === 'number') ids.add(src.department_id);
  const dep = src.department as { id?: unknown } | null | undefined;
  if (dep && typeof dep === 'object' && typeof dep.id === 'number') ids.add(dep.id);
  const list = src.departments as Array<{ id?: unknown } | null> | undefined;
  if (Array.isArray(list)) {
    list.forEach((d) => {
      if (d && typeof d.id === 'number') ids.add(d.id);
    });
  }
  return [...ids];
};

/** Oy ichidagi eng so'nggi yozuvli kunning jamlanmasi (tanlangan kunda yozuv bo'lmasa ko'rsatiladi) */
interface LastDaySummary {
  date: string;
  firstIn: string;
  lastOut: string;
  statuses: StatusCode[];
}

/** "2026-06-08" → "08.06" */
const formatDayMonth = (iso: string) =>
  iso && iso.length >= 10 ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : iso;

interface EmployeeRow {
  id: number;
  employee: string;
  position: string;
  branch: AttendanceBranch | null;
  branchId?: number;
  firstIn: string;
  lastOut: string;
  statuses: StatusCode[];
  deptIds: number[];
  lastActivity: LastDaySummary | null;
  /** Kun uchun yagona umumiy status (Kelgan/Kech qolgan/Uzrli/Sababsiz) */
  dayStatus?: StatusCode | null;
  /** lastActivity kunining umumiy statusi */
  lastDayStatus?: StatusCode | null;
}

/**
 * Kunning yagona umumiy statusi. Ustuvorlik: kech qolgan > kelgan > uzrli > sababsiz.
 * Kirdi/chiqdi yozuvi bo'lsa-yu status kodi kelmasa ham "Kelgan" deb hisoblanadi.
 */
const overallDayStatus = (day: {
  statuses: StatusCode[];
  firstIn: string;
  lastOut: string;
}): StatusCode | null => {
  if (day.statuses.includes('K')) return 'K';
  if (day.statuses.includes('+') || day.firstIn || day.lastOut) return '+';
  if (day.statuses.includes('S')) return 'S';
  if (day.statuses.includes('NB')) return 'NB';
  return null;
};

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
  const { data: departmentOptions } = useOptions('departments');

  // Har bir tab uchun alohida permission (admin/superadmin hammasini ko'radi)
  const deptAllowed: Record<DeptSlug, boolean> = {
    pedagog: usePermission('attendance.department.pedagog.view'),
    mamuriy: usePermission('attendance.department.mamuriy.view'),
    texnik: usePermission('attendance.department.texnik.view'),
    sotuv: usePermission('attendance.department.sotuv.view'),
  };

  const visibleTabs = DEPT_TABS.filter((tab) => deptAllowed[tab.slug]);

  const [activeDept, setActiveDept] = useState<DeptSlug | null>(null);

  // Birinchi ruxsat etilgan tab default ochiladi
  useEffect(() => {
    if (visibleTabs.length === 0) {
      if (activeDept !== null) setActiveDept(null);
      return;
    }
    if (!activeDept || !visibleTabs.some((tab) => tab.slug === activeDept)) {
      setActiveDept(visibleTabs[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTabs.map((tab) => tab.slug).join(','), activeDept]);

  const { data, isLoading } = useQuery<{ data: FlatAttendanceRecord[] }>({
    queryKey: ['attendances', month],
    queryFn: async () => {
      const { from, to } = monthRange(month);
      const { data } = await API.get('/attendances', { params: { from, to, per_page: 1000 } });
      // Backend ba'zan tekis massiv, ba'zan { data: [...] } qaytaradi
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      return { data: list };
    },
    placeholderData: keepPreviousData,
  });

  // Davomat yozuvlaridan xodim haqidagi doimiy ma'lumotlar:
  // bo'lim (id'lar + normallashgan nomlari) va lavozim.
  // Sana filtridan OLDIN, oyning barcha yozuvlaridan yig'iladi — shunda
  // tanlangan kunda kelmagan xodimning bo'limi/lavozimi ham aniqlanadi.
  const recordDepts = useMemo(() => {
    const byEmp: Record<number, number[]> = {};
    const names: Record<number, string> = {};
    const positions: Record<number, string> = {};
    const branches: Record<number, { branch: AttendanceBranch | null; branchId?: number }> = {};
    const lastActivity: Record<number, LastDaySummary> = {};
    (data?.data || []).forEach((r) => {
      if (r.position && !positions[r.employee_id]) positions[r.employee_id] = r.position;
      if (!branches[r.employee_id] && (r.branch || r.branch_id)) {
        branches[r.employee_id] = { branch: r.branch || null, branchId: r.branch_id };
      }
      const laTime = shortTime(r.time || r.check_in);
      if (r.date) {
        let cur = lastActivity[r.employee_id];
        if (!cur || r.date > cur.date) {
          cur = { date: r.date, firstIn: '', lastOut: '', statuses: [] };
          lastActivity[r.employee_id] = cur;
        }
        if (r.date === cur.date) {
          if (laTime) {
            if (r.type === 'out') {
              if (!cur.lastOut || laTime > cur.lastOut) cur.lastOut = laTime;
            } else if (!cur.firstIn || laTime < cur.firstIn) {
              cur.firstIn = laTime;
            }
          }
          (Array.isArray(r.status) ? r.status : []).forEach((s) => {
            const code = toStatusCode(s);
            if (code && !cur.statuses.includes(code)) cur.statuses.push(code);
          });
        }
      }
      const dep = (r as unknown as Record<string, unknown>).department as
        | Record<string, unknown>
        | null
        | undefined;
      if (!dep || typeof dep.id !== 'number') return;
      if (!names[dep.id]) {
        names[dep.id] = normalizeName(
          [dep.code, dep.name_uz, dep.name_ru, dep.name_en].filter(Boolean).join(' '),
        );
      }
      const list = (byEmp[r.employee_id] ??= []);
      if (!list.includes(dep.id)) list.push(dep.id);
    });
    return { byEmp, names, positions, branches, lastActivity };
  }, [data?.data]);

  // Slug → shu slugga mos bo'lim id'lari. Nom/kod ham /options/departments dan,
  // ham davomat yozuvlaridagi department obyektidan tekshiriladi.
  const deptIdsBySlug = useMemo(() => {
    const map = {} as Record<DeptSlug, Set<number>>;
    DEPT_TABS.forEach(({ slug, keywords }) => {
      const ids = new Set<number>();
      (departmentOptions || []).forEach((d) => {
        const haystack = normalizeName(
          [d.code, d.label, d.name_uz, d.name_ru, d.name_en].filter(Boolean).join(' '),
        );
        if (keywords.some((k) => haystack.includes(k))) ids.add(d.id);
      });
      Object.entries(recordDepts.names).forEach(([id, name]) => {
        if (keywords.some((k) => name.includes(k))) ids.add(Number(id));
      });
      map[slug] = ids;
    });
    return map;
  }, [departmentOptions, recordDepts]);

  // employee_id → bo'lim id'lari (options/employees dan)
  const employeeDeptMap = useMemo(() => {
    const map: Record<number, number[]> = {};
    (employeeOptions || []).forEach((e: OptionItem) => {
      map[e.id] = extractDeptIds(e);
    });
    return map;
  }, [employeeOptions]);

  // Har bir xodim uchun bitta qator: tanlangan kundagi birinchi kirish va oxirgi chiqish
  const rows = useMemo(() => {
    const byEmployee: Record<number, EmployeeRow> = {};

    // Avval barcha xodimlarni qatorga qo'shamiz — davomati yo'qlari ham ko'rinsin
    (employeeOptions || []).forEach((e) => {
      byEmployee[e.id] = {
        id: e.id,
        employee: e.label,
        position: recordDepts.positions[e.id] || '',
        branch: recordDepts.branches[e.id]?.branch ?? null,
        branchId: recordDepts.branches[e.id]?.branchId,
        lastActivity: recordDepts.lastActivity[e.id] || null,
        firstIn: '',
        lastOut: '',
        statuses: [],
        deptIds: [
          ...new Set([...(employeeDeptMap[e.id] || []), ...(recordDepts.byEmp[e.id] || [])]),
        ],
      };
    });

    (data?.data || [])
      .filter((r) => (date ? r.date === date : true))
      .forEach((r) => {
        const row = (byEmployee[r.employee_id] ??= {
          id: r.employee_id,
          employee: r.employee,
          position: recordDepts.positions[r.employee_id] || '',
          branch: recordDepts.branches[r.employee_id]?.branch ?? null,
          branchId: recordDepts.branches[r.employee_id]?.branchId,
          lastActivity: recordDepts.lastActivity[r.employee_id] || null,
          firstIn: '',
          lastOut: '',
          statuses: [],
          deptIds: [
            ...new Set([
              ...(employeeDeptMap[r.employee_id] || []),
              ...(recordDepts.byEmp[r.employee_id] || []),
            ]),
          ],
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

    // Aktiv tab bo'lsa faqat shu bo'limdagi xodimlar ko'rinadi
    const activeDeptIds = activeDept ? deptIdsBySlug[activeDept] : null;

    return Object.values(byEmployee)
      .filter((row) => {
        const matchSearch = search
          ? row.employee.toLowerCase().includes(search.toLowerCase())
          : true;
        const matchBranch = branchId ? String(row.branchId) === branchId : true;
        const matchDept = activeDeptIds ? row.deptIds.some((id) => activeDeptIds.has(id)) : true;
        return matchSearch && matchBranch && matchDept;
      })
      .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id))
      .map((row) => ({
        ...row,
        dayStatus: overallDayStatus(row),
        lastDayStatus: row.lastActivity ? overallDayStatus(row.lastActivity) : null,
      }));
  }, [
    data?.data,
    employeeOptions,
    employeeDeptMap,
    recordDepts,
    date,
    search,
    branchId,
    sortAsc,
    activeDept,
    deptIdsBySlug,
  ]);

  const toggleAll = (checked: boolean) => setSelected(checked ? rows.map((r) => r.id) : []);
  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section className="attendance-page container">
      {visibleTabs.length > 0 && (
        <div className="attendance-dept-tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.slug}
              type="button"
              className={`attendance-dept-tab${activeDept === tab.slug ? ' active' : ''}`}
              onClick={() => {
                setActiveDept(tab.slug);
                setSelected([]);
              }}
            >
              {t(`attendance.tabs.${tab.slug}`)}
            </button>
          ))}
        </div>
      )}

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
                      {/* Bitta badge: "09:00-18:00 Kelgan" — birinchi kirish, oxirgi chiqish va umumiy status */}
                      {r.dayStatus ? (
                        <span className={`attendance-day-status ${statusClass(r.dayStatus)}`}>
                          {(r.firstIn || r.lastOut) && (
                            <b className="attendance-day-times">
                              {r.firstIn || '--:--'}-{r.lastOut || '--:--'}
                            </b>
                          )}
                          {t(statusLabelKey(r.dayStatus))}
                        </span>
                      ) : r.lastActivity && r.lastDayStatus ? (
                        /* Tanlangan kunda yozuv yo'q — oxirgi yozuvli kun xira ko'rsatiladi */
                        <span
                          className={`attendance-day-status attendance-last-activity ${statusClass(
                            r.lastDayStatus,
                          )}`}
                        >
                          {(r.lastActivity.firstIn || r.lastActivity.lastOut) && (
                            <b className="attendance-day-times">
                              {r.lastActivity.firstIn || '--:--'}-
                              {r.lastActivity.lastOut || '--:--'}
                            </b>
                          )}
                          {t(statusLabelKey(r.lastDayStatus))}
                          <span className="attendance-last-date">
                            {formatDayMonth(r.lastActivity.date)}
                          </span>
                        </span>
                      ) : (
                        <span className="type-badge type-none">-</span>
                      )}
                    </div>
                  </td>
                  <td>{r.branch ? getLocalized(r.branch, 'name', i18n.language) : '-'}</td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={6} message={t('attendance.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AttendancePage;
