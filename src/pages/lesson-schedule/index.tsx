import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '../../api/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text, Tooltip, Menu, Button, Select, Stack } from '@mantine/core';
import {
  faSearch,
  faChevronLeft,
  faChevronRight,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import type { Group, GroupsApiResponse, ScheduleRoom } from '../../types/groups.types';
import { ScheduleCard } from './ScheduleCard';
import { DetailModal } from './DetailModal';
import { getLocalized } from '../../utils/getLocalized';
import { useTranslation } from 'react-i18next';
import './lessonSchedule.css';

function useRooms() {
  return useQuery<ScheduleRoom[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await API.get<{ data: ScheduleRoom[] }>('/rooms');
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
  });
}

function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups', 'schedule'],
    queryFn: async () => {
      const res = await API.get<GroupsApiResponse>('/groups');
      return Array.isArray(res.data.data) ? res.data.data : [];
    },
  });
}

const WEEKDAY_MAP: Record<number, string> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  0: 'sunday',
};


const WEEKDAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ODD_DAYS = ['monday', 'wednesday', 'friday'];
const EVEN_DAYS = ['tuesday', 'thursday', 'saturday'];

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function getWeeklyDates(baseDate: Date) {
  const dates = [];
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(new Date(baseDate).setDate(diff));

  for (let i = 0; i < 6; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const weekdayKey = WEEKDAY_MAP[d.getDay()];
    dates.push({
      key: formatDateStr(d),
      date: d.toLocaleDateString('ru-RU'),
      fullDate: d,
      weekdayKey,
    });
  }
  return dates;
}

function getDailyTimeSlots(interval: number) {
  const slots = [];
  let current = 6 * 60;
  const end = 21 * 60;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    slots.push(timeStr);
    current += interval;
  }
  return slots;
}

function formatDateStr(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function timeToMinutes(timeStr: string) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

const TIMELINE_COLORS = ['#003f7a', '#d91111', '#f39200', '#109910', '#8b5cf6', '#0ea5e9'];

function getMonthlyGrid(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startDay = firstDayOfMonth.getDay();
  if (startDay === 0) startDay = 7;

  const grid = [];

  const offset = startDay - 1;
  for (let i = 0; i < offset && i < 6; i++) {
    grid.push(null);
  }

  for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
    const dateObj = new Date(year, month, d);
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek !== 0) {
      grid.push({
        day: d,
        key: formatDateStr(dateObj),
        weekdayKey: WEEKDAY_MAP[dayOfWeek],
      });
    }
  }

  return grid;
}

const LessonSchedule = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<string | null>(null);
  const [intervalFilter, setIntervalFilter] = useState<string | null>(null);
  const [dayTypeFilter, setDayTypeFilter] = useState<'odd' | 'even' | null>(null);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();
  const { data: groups = [], isLoading: isLoadingGroups } = useGroups();

  const weeklyDates = useMemo(() => getWeeklyDates(selectedDate), [selectedDate]);
  const monthlyGrid = useMemo(() => getMonthlyGrid(selectedDate), [selectedDate]);
  const dailySlots = useMemo(
    () => getDailyTimeSlots(Number(intervalFilter || 30)),
    [intervalFilter],
  );

  const teachers = useMemo(() => {
    const list: Record<number, { id: number; name: string }> = {};
    groups.forEach((g) => {
      if (g.teacher) {
        list[g.teacher.id] = {
          id: g.teacher.id,
          name: `${g.teacher.first_name} ${g.teacher.last_name}`,
        };
      }
    });
    return Object.values(list);
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.course ? getLocalized(g.course, 'name', lang).toLowerCase() : '').includes(
          search.toLowerCase(),
        ) ||
        g.teacher?.first_name.toLowerCase().includes(search.toLowerCase());

      const matchesTeacher = !teacherFilter || g.teacher?.id === Number(teacherFilter);

      const matchesDayType =
        !dayTypeFilter ||
        (dayTypeFilter === 'odd'
          ? g.days.some((d) => ODD_DAYS.includes(d))
          : g.days.some((d) => EVEN_DAYS.includes(d)));

      return matchesSearch && matchesTeacher && matchesDayType;
    });
  }, [groups, search, teacherFilter, dayTypeFilter, lang]);

  const monthlyKeys = useMemo(() => {
    return monthlyGrid.filter((d) => d !== null).map((d) => d!.key);
  }, [monthlyGrid]);

  const groupsByDate = useMemo(() => {
    const data: Record<string, Group[]> = {};
    monthlyKeys.forEach((key) => {
      data[key] = [];
    });

    filteredGroups.forEach((group) => {
      monthlyKeys.forEach((key) => {
        const d = new Date(key);
        const weekdayKey = WEEKDAY_MAP[d.getDay()];
        if (group.days.includes(weekdayKey)) {
          data[key].push(group);
        }
      });
    });

    return data;
  }, [filteredGroups, monthlyKeys]);

  const tableData = useMemo(() => {
    const data: Record<string, Record<string, Group[]>> = {};
    rooms.forEach((room) => {
      data[room.id] = {};
      weeklyDates.forEach((d) => {
        data[room.id][d.key] = [];
      });
    });

    filteredGroups.forEach((group) => {
      if (group.room) {
        weeklyDates.forEach((d) => {
          if (group.days.includes(d.weekdayKey)) {
            if (data[group.room!.id]?.[d.key]) {
              data[group.room!.id][d.key].push(group);
            }
          }
        });
      }
    });

    return data;
  }, [rooms, filteredGroups, weeklyDates]);

  const navigate = (direction: number) => {
    const next = new Date(selectedDate);
    if (view === 'monthly') {
      next.setMonth(selectedDate.getMonth() + direction);
    } else if (view === 'weekly') {
      next.setDate(selectedDate.getDate() + direction * 7);
    } else {
      next.setDate(selectedDate.getDate() + direction);
    }
    setSelectedDate(next);
  };

  const currentLabel = useMemo(() => {
    if (view === 'monthly') {
      return `${t(`lessonSchedule.months.${MONTH_KEYS[selectedDate.getMonth()]}`)} ${selectedDate.getFullYear()}`;
    }
    if (view === 'weekly') {
      const start = weeklyDates[0];
      const end = weeklyDates[weeklyDates.length - 1];
      return `${start.date} - ${end.date}`;
    }
    const weekday = WEEKDAY_MAP[selectedDate.getDay()];
    return `${t(`lessonSchedule.weekdays.${weekday}`)}, ${selectedDate.toLocaleDateString('ru-RU')}`;
  }, [view, selectedDate, weeklyDates, t]);

  if (isLoadingRooms || isLoadingGroups) {
    return (
      <div className="teacher-groups-loading">
        <div className="teacher-groups-spinner"></div>
      </div>
    );
  }

  return (
    <div className="lesson-schedule-container container">
      <div className="lesson-schedule-header">
        <div className="header-left">
          <div className="view-switcher">
            <button
              className={`view-btn ${view === 'daily' ? 'active' : ''}`}
              onClick={() => setView('daily')}
            >
              {t('lessonSchedule.daily')}
            </button>
            <button
              className={`view-btn ${view === 'weekly' ? 'active' : ''}`}
              onClick={() => setView('weekly')}
            >
              {t('lessonSchedule.weekly')}
            </button>
            <button
              className={`view-btn ${view === 'monthly' ? 'active' : ''}`}
              onClick={() => setView('monthly')}
            >
              {t('lessonSchedule.monthly')}
            </button>
          </div>

          <div className="month-nav">
            <button onClick={() => navigate(-1)} className="nav-btn">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <Text fw={700} className="month-name-display">
              {currentLabel}
            </Text>
            <button onClick={() => navigate(1)} className="nav-btn">
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="search-input-wrap">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder={t('lessonSchedule.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {view === 'daily' && (
            <div className="interval-filter-wrap">
              {(['15', '30', '60', '90'] as const).map((val) => (
                <button
                  key={val}
                  className={`interval-btn ${intervalFilter === val ? 'active' : ''}`}
                  onClick={() => setIntervalFilter(intervalFilter === val ? null : val)}
                >
                  {t(`lessonSchedule.min${val}`)}
                </button>
              ))}
            </div>
          )}

          {(view === 'weekly' || view === 'monthly') && (
            <div className="day-type-filter">
              <button
                className={`day-type-btn ${dayTypeFilter === 'odd' ? 'active' : ''}`}
                onClick={() => setDayTypeFilter(dayTypeFilter === 'odd' ? null : 'odd')}
              >
                {t('lessonSchedule.oddDays')}
              </button>
              <button
                className={`day-type-btn ${dayTypeFilter === 'even' ? 'active' : ''}`}
                onClick={() => setDayTypeFilter(dayTypeFilter === 'even' ? null : 'even')}
              >
                {t('lessonSchedule.evenDays')}
              </button>
            </div>
          )}

          <Menu shadow="md" width={260} position="bottom-end" withArrow>
            <Menu.Target>
              <Button
                h={55}
                variant="outline"
                color="gray"
                leftSection={<FontAwesomeIcon icon={faFilter} />}
                className="saralash-btn"
              >
                {t('lessonSchedule.filter')}
              </Button>
            </Menu.Target>

            <Menu.Dropdown p="md">
              <Stack gap="sm">
                <Select
                  label={t('lessonSchedule.filterTeacher')}
                  placeholder={t('lessonSchedule.filterTeacherPlaceholder')}
                  data={teachers.map((teacher) => ({
                    value: String(teacher.id),
                    label: teacher.name,
                  }))}
                  value={teacherFilter}
                  onChange={setTeacherFilter}
                  clearable
                />
                <Button
                  variant="outline"
                  color="red"
                  onClick={() => {
                    setTeacherFilter(null);
                    setIntervalFilter(null);
                    setDayTypeFilter(null);
                  }}
                  mt="sm"
                >
                  {t('lessonSchedule.clearFilter')}
                </Button>
              </Stack>
            </Menu.Dropdown>
          </Menu>
        </div>
      </div>

      {view === 'daily' && (
        <div className="schedule-table-container">
          <table className="schedule-table daily-table">
            <thead>
              <tr>
                <th className="room-header corner-header">{t('lessonSchedule.cornerHeaderDaily')}</th>
                {dailySlots.map((time) => (
                  <th key={time} className="time-header">
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const dateKey = formatDateStr(selectedDate);
                const lessonsForRoom = tableData[room.id]?.[dateKey] || [];
                const COLUMN_WIDTH = 80;
                const intervalVal = Number(intervalFilter || 30);
                const pixelsPerMinute = COLUMN_WIDTH / intervalVal;
                const startOfDayMin = 6 * 60;

                const roomName = room.name_uz || room.name_ru || room.name || `Xona ${room.id}`;

                return (
                  <tr key={room.id}>
                    <td className="room-cell">{roomName}</td>
                    {dailySlots.map((time, index) => (
                      <td key={time} className="time-cell">
                        {index === 0 && (
                          <div className="timeline-wrapper">
                            {lessonsForRoom.map((group) => {
                              const startMin = timeToMinutes(group.start_time);
                              const endMin = timeToMinutes(group.end_time);
                              const left =
                                (startMin - startOfDayMin) * pixelsPerMinute + COLUMN_WIDTH / 2;
                              const width = (endMin - startMin) * pixelsPerMinute;
                              const color = TIMELINE_COLORS[group.id % TIMELINE_COLORS.length];

                              return (
                                <div
                                  key={group.id}
                                  className="timeline-bar"
                                  style={{
                                    left: `${left}px`,
                                    width: `${width}px`,
                                    backgroundColor: color,
                                  }}
                                  onClick={() => setDetailGroup(group)}
                                >
                                  <span className="timeline-bar-text">
                                    {group.name} {group.teacher?.last_name}{' '}
                                    {group.teacher?.first_name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === 'weekly' && (
        <div className="schedule-table-container">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="room-header corner-header">{t('lessonSchedule.cornerHeaderWeekly')}</th>
                {weeklyDates.map((wd) => (
                  <th
                    key={wd.key}
                    onClick={() => {
                      setSelectedDate(wd.fullDate);
                      setView('daily');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="day-header">
                      <span className="day-name">{t(`lessonSchedule.weekdays.${wd.weekdayKey}`)}</span>
                      <span className="day-date">{wd.date}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="room-cell">
                    {room.name_uz || room.name_ru || room.name || `Xona ${room.id}`}
                  </td>
                  {weeklyDates.map((d) => (
                    <td key={`${room.id}-${d.key}`}>
                      {tableData[room.id]?.[d.key]?.map((group) => (
                        <ScheduleCard
                          key={group.id}
                          group={group}
                          onClick={() => setDetailGroup(group)}
                        />
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'monthly' && (
        <div className="monthly-calendar-container">
          <div className="calendar-grid-header">
            {WEEKDAYS_ORDER.map((day) => (
              <div key={day} className="grid-header-cell">
                {t(`lessonSchedule.weekdays.${day}`)}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {monthlyGrid.map((dayData, idx) => (
              <div key={idx} className={`calendar-cell ${!dayData ? 'empty' : ''}`}>
                {dayData && (
                  <>
                    <span className="cell-date">{dayData.day}</span>
                    <div className="cell-content">
                      {groupsByDate[dayData.key]?.map((group) => (
                        <Tooltip
                          key={group.id}
                          label={`${group.name} (${group.level ? getLocalized(group.level, 'name', lang) : ''})`}
                        >
                          <div
                            className="compact-lesson-item"
                            onClick={() => setDetailGroup(group)}
                          >
                            <span className="item-text">
                              {group.name} -{' '}
                              {group.level ? getLocalized(group.level, 'name', lang) : ''}{' '}
                              {group.start_time?.slice(0, 5)}-{group.end_time?.slice(0, 5)}
                            </span>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mobile-view">
        {weeklyDates.map((wd) => (
          <div key={wd.key} className="mobile-day-section">
            <div className="mobile-day-title">
              {t(`lessonSchedule.weekdays.${wd.weekdayKey}`)} {wd.date}
            </div>
            <div className="mobile-cards-grid">
              {filteredGroups
                .filter((g) => g.days.includes(wd.weekdayKey))
                .map((group) => (
                  <ScheduleCard
                    key={group.id}
                    group={group}
                    isMobile
                    onClick={() => setDetailGroup(group)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      <DetailModal
        group={detailGroup}
        opened={!!detailGroup}
        onClose={() => setDetailGroup(null)}
      />
    </div>
  );
};

export default LessonSchedule;
