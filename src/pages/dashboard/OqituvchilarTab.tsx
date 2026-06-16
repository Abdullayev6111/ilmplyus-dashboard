import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  fetchEmployeesData,
  fetchGroupsData,
  fetchRoomsData,
  fetchAttendancesData,
} from './dashboard.service';
import type { Room } from '@/types/groups.types';

const DAYS_EN = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDateByOffset(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

type AttStatus = 'present' | 'late' | 'absent' | 'reason' | 'none';
const ATT_COLORS: Record<AttStatus, string> = {
  present: '#22c55e',
  late: '#f59e0b',
  absent: '#ef4444',
  reason: '#3b82f6',
  none: '#e2e8f0',
};

const LEAVE_COLORS = ['#f59e0b', '#3b82f6', '#ef4444'];

export default function OqituvchilarTab() {
  const { t } = useTranslation();
  const [dayOffset, setDayOffset] = useState<0 | -1 | null>(0);
  const [roomFilter, setRoomFilter] = useState<'all' | 'bosh' | 'band'>('all');

  const ATT_LEGEND = [
    { label: t('dashboard.oqituvchi.attLegend.came'), color: '#22c55e' },
    { label: t('dashboard.oqituvchi.attLegend.late'), color: '#f59e0b' },
    { label: t('dashboard.oqituvchi.attLegend.absent'), color: '#ef4444' },
    { label: t('dashboard.oqituvchi.attLegend.reason'), color: '#3b82f6' },
  ];

  const DAYS_UZ = [
    t('dashboard.oqituvchi.days.mon'),
    t('dashboard.oqituvchi.days.tue'),
    t('dashboard.oqituvchi.days.wed'),
    t('dashboard.oqituvchi.days.thu'),
    t('dashboard.oqituvchi.days.fri'),
    t('dashboard.oqituvchi.days.sat'),
  ];

  const { data: employees = [] } = useQuery({
    queryKey: ['dash-employees'],
    queryFn: fetchEmployeesData,
  });
  const { data: groupsData } = useQuery({
    queryKey: ['dash-groups'],
    queryFn: fetchGroupsData,
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ['dash-rooms'],
    queryFn: fetchRoomsData,
  });
  const { data: attendances = [] } = useQuery({
    queryKey: ['dash-attendances'],
    queryFn: fetchAttendancesData,
  });

  const groups = useMemo(() => groupsData?.list ?? [], [groupsData]);

  const totalEmployees = employees.length;
  const totalGroupHours = groups.reduce((s, g) => s + (g.duration ?? 0) * (g.days?.length ?? 0), 0);
  const avgHours = totalEmployees > 0 ? Math.round(totalGroupHours / totalEmployees) : 0;

  const thisWeekAttendances = useMemo(() => {
    const monday = getDateByOffset(-((new Date().getDay() + 6) % 7));
    const sunday = getDateByOffset(6 - ((new Date().getDay() + 6) % 7));
    return attendances.filter((a) => {
      const d = new Date(a.date ?? a.created_at ?? '');
      return d >= monday && d <= sunday;
    });
  }, [attendances]);

  const attPct = useMemo(() => {
    if (!thisWeekAttendances.length) return 0;
    const present = thisWeekAttendances.filter(
      (a) => a.status === 'present' || a.status === 'late',
    ).length;
    return Math.round((present / thisWeekAttendances.length) * 100);
  }, [thisWeekAttendances]);

  const lateCount = thisWeekAttendances.filter((a) => a.status === 'late').length;

  const empMatrix = useMemo(() => {
    return employees.slice(0, 10).map((emp) => {
      const weekDays = DAYS_EN.map((_, i) => {
        const date = getDateByOffset(-((new Date().getDay() + 6) % 7) + i);
        const dateStr = isoDate(date);
        const rec = attendances.find(
          (a) =>
            (a.employee_id === emp.id || a.user_id === emp.id) &&
            (a.date ?? a.created_at?.split('T')[0]) === dateStr,
        );
        return (rec?.status as AttStatus) ?? 'none';
      });
      const empGroups = groups.filter((g) => g.teacher?.id === emp.id);
      const workload = empGroups.reduce((s, g) => s + (g.duration ?? 0) * (g.days?.length ?? 0), 0);
      const presentCount = weekDays.filter((s) => s === 'present' || s === 'late').length;
      const totalDays = weekDays.filter((s) => s !== 'none').length || 1;
      const pct = Math.round((presentCount / totalDays) * 100);
      const courseName = empGroups[0]?.course?.name_uz || empGroups[0]?.course?.name_uz || '—';
      return { emp, weekDays, workload, pct, courseName, groups: empGroups };
    });
  }, [employees, groups, attendances]);

  const leaveData = useMemo(() => {
    const late = attendances.filter((a) => a.status === 'late').length;
    const reason = attendances.filter((a) => a.status === 'reason').length;
    const absent = attendances.filter((a) => a.status === 'absent').length;
    return [
      { name: t('dashboard.oqituvchi.leaveKeys.late'), value: late },
      { name: t('dashboard.oqituvchi.leaveKeys.reason'), value: reason },
      { name: t('dashboard.oqituvchi.leaveKeys.absent'), value: absent },
    ];
  }, [attendances, t]);

  const selectedDate = dayOffset !== null ? getDateByOffset(dayOffset) : new Date();
  const selectedDayEn =
    DAYS_EN[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1] ?? 'monday';

  const roomStatuses = useMemo<{ room: Room; isBusy: boolean; group?: (typeof groups)[0] }[]>(
    () =>
      rooms.map((r) => {
        const grp = groups.find((g) => g.room?.id === r.id && g.days?.includes(selectedDayEn));
        return { room: r, isBusy: !!grp, group: grp };
      }),
    [rooms, groups, selectedDayEn],
  );

  const filteredRooms = useMemo(() => {
    if (roomFilter === 'bosh') return roomStatuses.filter((r) => !r.isBusy);
    if (roomFilter === 'band') return roomStatuses.filter((r) => r.isBusy);
    return roomStatuses;
  }, [roomStatuses, roomFilter]);

  return (
    <div className="dash-tab-content">
      <div className="dash-stats-row">
        <div
          className="dash-stat-card"
          style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)', color: '#fff' }}
        >
          <p className="dash-stat-card__label" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {t('dashboard.oqituvchi.totalTeachers')}
          </p>
          <p className="dash-stat-card__value" style={{ color: '#fff' }}>
            {totalEmployees}
          </p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--blue" />
          <p className="dash-stat-card__label">{t('dashboard.oqituvchi.avgWorkload')}</p>
          <p className="dash-stat-card__value">
            {avgHours} {t('dashboard.common.soat')}
          </p>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card__bg dash-stat-card__bg--green" />
          <p className="dash-stat-card__label">{t('dashboard.oqituvchi.staffAttendance')}</p>
          <p className="dash-stat-card__value dash-stat-card__value--green">{attPct}%</p>
        </div>
        <div className="dash-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="dash-stat-card__bg dash-stat-card__bg--red" />
          <p className="dash-stat-card__label">{t('dashboard.oqituvchi.weeklyLate')}</p>
          <p className="dash-stat-card__value" style={{ color: '#f59e0b' }}>
            {lateCount} {t('dashboard.common.ta')}
          </p>
        </div>
      </div>

      <div className="dash-mid-row">
        <div className="dash-card">
          <h3 className="dash-card__title">{t('dashboard.oqituvchi.matrixTitle')}</h3>
          {empMatrix.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
              <table className="oqit-table">
                <thead>
                  <tr>
                    <th>{t('dashboard.oqituvchi.teacherCol')}</th>
                    <th>{t('dashboard.oqituvchi.speciality')}</th>
                    <th>{t('dashboard.oqituvchi.dayAtt')}</th>
                    <th>{t('dashboard.oqituvchi.indicator')}</th>
                    <th>{t('dashboard.oqituvchi.workloadCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {empMatrix.map(({ emp, weekDays, workload, pct, courseName }) => {
                    const initials = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`;
                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="oqit-emp-cell">
                            <span className="oqit-emp-cell__avatar">{initials}</span>
                            <span style={{ whiteSpace: 'nowrap' }}>
                              {emp.first_name} {emp.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="oqit-table__sub" style={{ whiteSpace: 'nowrap' }}>{courseName}</td>
                        <td>
                          <div className="oqit-dots">
                            {weekDays.map((s, i) => (
                              <span
                                key={i}
                                className="oqit-dot"
                                style={{ background: ATT_COLORS[s] }}
                                title={DAYS_UZ[i]}
                              />
                            ))}
                          </div>
                        </td>
                        <td>
                          {pct > 0 ? (
                            <span
                              className="oquv-badge"
                              style={{
                                background:
                                  pct >= 90 ? '#dcfce7' : pct >= 70 ? '#fef9c3' : '#fee2e2',
                                color: pct >= 90 ? '#16a34a' : pct >= 70 ? '#ca8a04' : '#dc2626',
                              }}
                            >
                              {pct}%
                            </span>
                          ) : (
                            <span
                              className="oquv-badge"
                              style={{ background: '#f1f5f9', color: '#64748b' }}
                            >
                              {t('dashboard.oqituvchi.excused')}
                            </span>
                          )}
                        </td>
                        <td className="oqit-table__sub">
                          {workload} {t('dashboard.common.soat')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="oqit-legend">
                {ATT_LEGEND.map((l) => (
                  <span key={l.label} className="oqit-legend__item">
                    <span className="oqit-dot" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="dash-empty">{t('dashboard.common.noData')}</div>
          )}
        </div>

        <div className="dash-card">
          <h3 className="dash-card__title">{t('dashboard.oqituvchi.leaveTitle')}</h3>
          <p className="dash-card__sub">{t('dashboard.oqituvchi.leaveSub')}</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PieChart width={220} height={220}>
              <Pie
                data={leaveData}
                cx={105}
                cy={105}
                innerRadius={60}
                outerRadius={95}
                dataKey="value"
                paddingAngle={2}
              >
                {leaveData.map((_, i) => (
                  <Cell key={i} fill={LEAVE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number | undefined, name: string | undefined) => [
                  `${v ?? 0} ta`,
                  name ?? '',
                ]}
              />
            </PieChart>
          </div>
          <ul className="demo-legend" style={{ marginTop: 8 }}>
            {leaveData.map((d, i) => (
              <li key={i} className="demo-legend__item">
                <span className="demo-legend__dot" style={{ background: LEAVE_COLORS[i] }} />
                {d.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="dash-card">
        <div className="rooms-header">
          <div>
            <h3 className="dash-card__title" style={{ margin: 0 }}>
              <i className="fa-solid fa-building" style={{ marginRight: 8, color: '#6366f1' }} />
              {t('dashboard.oqituvchi.roomsTitle')}
            </h3>
            <p className="dash-card__sub">{t('dashboard.oqituvchi.roomsSub')}</p>
          </div>
          <div className="rooms-controls">
            <div className="rooms-day-btns">
              <button
                className={`rooms-day-btn${dayOffset === 0 ? ' rooms-day-btn--active' : ''}`}
                onClick={() => setDayOffset(0)}
              >
                {t('dashboard.oqituvchi.today')}
              </button>
              <button
                className={`rooms-day-btn${dayOffset === -1 ? ' rooms-day-btn--active' : ''}`}
                onClick={() => setDayOffset(-1)}
              >
                {t('dashboard.oqituvchi.yesterday')}
              </button>
              <button
                className={`rooms-day-btn${dayOffset === null ? ' rooms-day-btn--active' : ''}`}
                onClick={() => setDayOffset(null)}
              >
                <i className="fa-solid fa-calendar" /> {t('dashboard.oqituvchi.other')}
              </button>
            </div>
            <div className="rooms-filter-btns">
              {(['all', 'bosh', 'band'] as const).map((f) => (
                <button
                  key={f}
                  className={`rooms-filter-btn${roomFilter === f ? ' rooms-filter-btn--active' : ''}`}
                  onClick={() => setRoomFilter(f)}
                >
                  {f === 'all'
                    ? t('dashboard.oqituvchi.all')
                    : f === 'bosh'
                      ? t('dashboard.oqituvchi.free')
                      : t('dashboard.oqituvchi.busy')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredRooms.length > 0 ? (
          <div className="rooms-grid">
            {filteredRooms.map(({ room, isBusy, group }) => (
              <div key={room.id} className={`room-card${isBusy ? ' room-card--band' : ''}`}>
                <div className="room-card__top">
                  <span className="room-card__name">
                    <i className="fa-solid fa-building" />
                    {room.name_uz || room.name}
                  </span>
                  <span
                    className={`room-card__badge${isBusy ? ' room-card__badge--band' : ' room-card__badge--bosh'}`}
                  >
                    {isBusy
                      ? t('dashboard.oqituvchi.busyLabel')
                      : t('dashboard.oqituvchi.freeLabel')}
                  </span>
                </div>
                {isBusy && group ? (
                  <>
                    <p className="room-card__course">
                      {group.course?.name_uz || group.course?.name_uz}
                    </p>
                    <p className="room-card__teacher">
                      <i className="fa-solid fa-user" />
                      {group.teacher
                        ? `${group.teacher.first_name?.[0] ?? ''}. ${group.teacher.last_name}`
                        : '—'}
                    </p>
                  </>
                ) : (
                  <p className="room-card__free">{t('dashboard.oqituvchi.freePlan')}</p>
                )}
                <div className="room-card__prog-track">
                  <div
                    className="room-card__prog-fill"
                    style={{
                      width: isBusy ? '100%' : '20%',
                      background: isBusy ? '#ef4444' : '#22c55e',
                    }}
                  />
                </div>
                <div className="room-card__footer">
                  <span>
                    <i className="fa-regular fa-calendar" /> {isoDate(selectedDate)}
                  </span>
                  {isBusy && group && (
                    <span>
                      <i className="fa-regular fa-clock" /> {group.start_time}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dash-empty">{t('dashboard.common.noRooms')}</div>
        )}
      </div>
    </div>
  );
}
