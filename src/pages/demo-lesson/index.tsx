import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { API } from '@/api/api';
import { getLocalized } from '@/utils/getLocalized';
import type { Group, Room, Employee } from '@/types/groups.types';
import type { DemoLesson, CreateDemoLessonPayload } from '@/types/demoLesson.types';
import {
  useCreateDemoLesson,
  useUpdateDemoLesson,
  useDeleteDemoLesson,
  useAttendanceDemoLesson,
} from './useDemoLesson';
import './demoLesson.css';

// ─── helpers ────────────────────────────────────────────────────────────────

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '-';
  const datePart = dateStr.split('T')[0]; // handle ISO "2026-05-25T19:00:00.000000Z"
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)}-${UZ_MONTHS[monthIdx] ?? ''}`;
  }
  return dateStr;
}

function formatCreatedAt(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()} ${hh}:${min}`;
  } catch {
    return dateStr;
  }
}

function apiDateToForm(apiDate: string): string {
  const datePart = apiDate.split('T')[0]; // handle ISO format
  const parts = datePart.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return apiDate;
}

function formDateToApi(formDate: string): string {
  const parts = formDate.split('.');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return formDate;
}

function isDateInPast(value: string): boolean {
  if (value.length < 10) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;

  const inputDay = parseInt(parts[0]);
  const inputMonth = parseInt(parts[1]);
  const inputYear = parseInt(parts[2]);
  if (isNaN(inputDay) || isNaN(inputMonth) || isNaN(inputYear)) return false;

  const today = new Date();
  const tY = today.getFullYear();
  const tM = today.getMonth() + 1;
  const tD = today.getDate();

  if (inputYear < tY) return true;
  if (inputYear > tY) return false;
  if (inputMonth < tM) return true;
  if (inputMonth > tM) return false;
  return inputDay < tD; // same year+month: true only if day is strictly less
}

function timeToMinutes(time: string): number {
  if (!time || time.length < 4) return -1;
  const [h, m] = time.split(':');
  return (parseInt(h) || 0) * 60 + (parseInt(m) || 0);
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getDayOfWeek(formDate: string): string {
  const parts = formDate.split('.');
  if (parts.length !== 3) return '';
  const d = new Date(Date.UTC(+parts[2], +parts[1] - 1, +parts[0]));
  return DAY_NAMES[d.getUTCDay()] ?? '';
}

function checkRoomOccupiedByGroups(
  groups: Group[],
  roomId: number,
  formDate: string,
  startTime: string,
  endTime: string,
): boolean {
  const dayName = getDayOfWeek(formDate);
  if (!dayName) return false;

  const apiDate = formDateToApi(formDate); // YYYY-MM-DD
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);
  if (newStart < 0 || newEnd < 0 || newStart >= newEnd) return false;

  return groups.some((g) => {
    if (!g.room || g.room.id !== roomId) return false;
    if (!g.days?.includes(dayName)) return false;
    if (g.start_date && apiDate < g.start_date) return false;
    if (g.end_date && apiDate > g.end_date) return false;

    const gs = timeToMinutes(g.start_time);
    const ge = timeToMinutes(g.end_time);
    return newStart < ge && newEnd > gs;
  });
}

// ─── sub-components ──────────────────────────────────────────────────────────

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // ── Deletion ──────────────────────────────────────────
    if (raw.length < value.length) {
      if (raw.includes(':')) {
        const [h, m = ''] = raw.split(':');
        const hd = h.replace(/\D/g, '').slice(0, 2);
        const md = m.replace(/\D/g, '').slice(0, 2);
        onChange(md ? `${hd}:${md}` : `${hd}:`);
      } else {
        onChange(raw.replace(/\D/g, '').slice(0, 2));
      }
      return;
    }

    // ── Addition ──────────────────────────────────────────
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      onChange('');
      return;
    }

    const h1 = +digits[0];

    // Single digit: if > 2 it can't be tens of hours → auto-colon
    if (digits.length === 1) {
      onChange(h1 > 2 ? `${h1}:` : digits[0]);
      return;
    }

    const h2 = +digits[1];
    const hour = h1 * 10 + h2;

    // Two digits form invalid hour (> 23)
    if (hour > 23) {
      // Treat first digit as hour, second digit starts minutes (if valid)
      onChange(h2 <= 5 ? `${h1}:${digits.slice(1, 3)}` : `${h1}:`);
      return;
    }

    // Valid hour → auto-colon
    const hs = `${digits[0]}${digits[1]}`;
    if (digits.length === 2) {
      onChange(`${hs}:`);
      return;
    }

    // First minute digit must be 0–5
    const m1 = +digits[2];
    if (m1 > 5) {
      onChange(`${hs}:`);
      return;
    }

    // Full or partial minute
    onChange(`${hs}:${digits.slice(2, 4)}`);
  };

  return (
    <div className="dl-input-wrap">
      <input
        className="dl-input"
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="00:00"
        maxLength={5}
      />
      <span className="dl-input-icon">
        <i className="fa-regular fa-clock" />
      </span>
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const isPast = isDateInPast(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const isDeleting = raw.length < value.length;
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 8);

    // ── Deletion: rebuild from digits without blocking ────
    if (isDeleting) {
      if (digits.length <= 2) {
        onChange(digits);
        return;
      }
      if (digits.length <= 4) {
        onChange(digits.slice(0, 2) + '.' + digits.slice(2));
        return;
      }
      onChange(digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4));
      return;
    }

    if (!digits) {
      onChange('');
      return;
    }

    // ── Day (01–31) ───────────────────────────────────────
    const d1 = +digits[0];
    if (d1 > 3) {
      onChange(value);
      return;
    } // reject 4–9 as first day digit

    if (digits.length === 1) {
      onChange(digits[0]);
      return;
    }

    const d2 = +digits[1];
    if (d1 === 0 && d2 === 0) {
      onChange(value);
      return;
    } // 00 invalid
    if (d1 === 3 && d2 > 1) {
      onChange(digits[0]);
      return;
    } // 32–39 invalid

    const dayStr = digits.slice(0, 2);
    if (digits.length === 2) {
      onChange(dayStr + '.');
      return;
    }

    // ── Month (01–12) ─────────────────────────────────────
    const m1 = +digits[2];
    if (m1 > 1) {
      onChange(dayStr + '.');
      return;
    } // reject 2–9 as first month digit

    if (digits.length === 3) {
      onChange(dayStr + '.' + digits[2]);
      return;
    }

    const m2 = +digits[3];
    if (m1 === 0 && m2 === 0) {
      onChange(value);
      return;
    } // 00 invalid
    if (m1 === 1 && m2 > 2) {
      onChange(dayStr + '.' + digits[2]);
      return;
    } // 13–19 invalid

    const monthStr = digits.slice(2, 4);
    if (digits.length === 4) {
      onChange(dayStr + '.' + monthStr + '.');
      return;
    }

    // ── Year (4 digits, no restriction) ──────────────────
    onChange(dayStr + '.' + monthStr + '.' + digits.slice(4, 8));
  };

  return (
    <div className="dl-date-field">
      <div className="dl-input-wrap">
        <input
          className={`dl-input${isPast ? ' dl-input--error' : ''}`}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={t('demoLesson.modal.datePlaceholder')}
          maxLength={10}
        />
        <span className="dl-input-icon">
          <i className="fa-regular fa-calendar" />
        </span>
      </div>
      <span className="dl-date-hint">{t('demoLesson.modal.dateHint')}</span>
    </div>
  );
}

function GroupSelect({
  value,
  onChange,
  groups,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: Group[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = groups.find((g) => String(g.id) === value);
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="dl-select-wrap" ref={ref}>
      <div className="dl-input-wrap">
        <input
          className="dl-input"
          type="text"
          value={open ? search : (selected?.name ?? '')}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('demoLesson.modal.groupPlaceholder')}
        />
        <span className="dl-input-icon dl-arrow-icon" onClick={() => setOpen((o) => !o)}>
          <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} />
        </span>
      </div>
      {open && (
        <div className="dl-dropdown">
          {filtered.length === 0 ? (
            <div className="dl-dropdown-empty">{t('demoLesson.modal.dropdownEmpty')}</div>
          ) : (
            filtered.map((g) => (
              <div
                key={g.id}
                className={`dl-dropdown-item${String(g.id) === value ? ' dl-dropdown-item--active' : ''}`}
                onClick={() => {
                  onChange(String(g.id));
                  setOpen(false);
                  setSearch('');
                }}
              >
                {g.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="dl-input-wrap">
      <select
        className="dl-input dl-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="dl-input-icon dl-arrow-icon">
        <i className="fa-solid fa-chevron-down" />
      </span>
    </div>
  );
}

function RoomSelect({
  value,
  onChange,
  rooms,
  groups,
  formDate,
  startTime,
  endTime,
}: {
  value: string;
  onChange: (v: string) => void;
  rooms: Room[];
  groups: Group[];
  formDate: string;
  startTime: string;
  endTime: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canCheck = formDate.length >= 10 && startTime.length >= 4 && endTime.length >= 4;
  const selected = rooms.find((r) => String(r.id) === value);
  const selectedOccupied =
    selected && canCheck
      ? checkRoomOccupiedByGroups(groups, selected.id, formDate, startTime, endTime)
      : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roomName = (r: Room) => r.name_uz || r.name || String(r.id);

  return (
    <div className="dl-select-wrap" ref={ref}>
      <div className="dl-room-trigger" onClick={() => setOpen((o) => !o)}>
        {selected ? (
          <span className="dl-room-trigger-inner">
            <span>{roomName(selected)}</span>
            {selectedOccupied !== null && (
              <span
                className={`dl-badge ${selectedOccupied ? 'dl-badge--occupied' : 'dl-badge--free'}`}
              >
                {selectedOccupied ? t('demoLesson.badge.occupied') : t('demoLesson.badge.free')}
              </span>
            )}
          </span>
        ) : (
          <span className="dl-placeholder">{t('demoLesson.modal.roomPlaceholder')}</span>
        )}
        <span className="dl-room-arrow">
          <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} />
        </span>
      </div>
      {open && (
        <div className="dl-dropdown">
          {rooms.map((room) => {
            const occupied = canCheck
              ? checkRoomOccupiedByGroups(groups, room.id, formDate, startTime, endTime)
              : null;
            return (
              <div
                key={room.id}
                className={`dl-dropdown-item dl-room-item${String(room.id) === value ? ' dl-dropdown-item--active' : ''}`}
                onClick={() => {
                  onChange(String(room.id));
                  setOpen(false);
                }}
              >
                <span>{roomName(room)}</span>
                {occupied !== null && (
                  <span
                    className={`dl-badge ${occupied ? 'dl-badge--occupied' : 'dl-badge--free'}`}
                  >
                    {occupied ? t('demoLesson.badge.occupied') : t('demoLesson.badge.free')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  lastPage,
  onChange,
}: {
  page: number;
  lastPage: number;
  onChange: (p: number) => void;
}) {
  const pages = useMemo<(number | '...')[]>(() => {
    if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1);
    const res: (number | '...')[] = [1];
    if (page > 3) res.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(lastPage - 1, page + 1); i++) res.push(i);
    if (page < lastPage - 2) res.push('...');
    res.push(lastPage);
    return res;
  }, [page, lastPage]);

  return (
    <div className="dl-pagination">
      <button
        className="dl-page-btn dl-page-arrow"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="dl-page-dots">
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`dl-page-btn${p === page ? ' dl-page-btn--active' : ''}`}
            onClick={() => onChange(p as number)}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="dl-page-btn dl-page-arrow"
        disabled={page === lastPage}
        onClick={() => onChange(page + 1)}
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
}

// ─── attendance view ─────────────────────────────────────────────────────────

function DemoLessonAttendanceView({
  lessonId,
  onClose,
}: {
  lessonId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [attendanceOverride, setAttendanceOverride] = useState<boolean | null>(null);

  const { data: lessonDetail, isLoading } = useQuery({
    queryKey: ['demo-lesson-detail', lessonId],
    queryFn: async () => {
      const res = await API.get(`/demo-lessons/${lessonId}`);
      return res.data?.data ?? res.data;
    },
  });

  const isPresent =
    attendanceOverride !== null
      ? attendanceOverride
      : lessonDetail?.attendance_status === 'present';

  const save = useAttendanceDemoLesson();

  const handleSaveAttendance = () => {
    save.mutate(
      {
        id: lessonId,
        data: { attendance_status: isPresent ? 'present' : 'absent' },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: t('demoLesson.notification.success'),
            message: t('demoLesson.notification.saved'),
            color: 'green',
          });
          onClose();
        },
      },
    );
  };

  const lid = lessonDetail?.lid;
  const fullName = lid
    ? [lid.last_name, lid.first_name, lid.father_name].filter(Boolean).join(' ')
    : '';

  return (
    <div className="dl-att-page">
      <div className="dl-att-header">
        <h1 className="dl-att-title">{t('demoLesson.attendance.title')}</h1>
        <button
          className="dl-att-save-btn"
          onClick={handleSaveAttendance}
          disabled={save.isPending}
        >
          {t('demoLesson.attendance.save')}
        </button>
      </div>

      <div className="dl-att-card">
        <table className="dl-att-table">
          <thead>
            <tr>
              <th>{t('demoLesson.table.id')}</th>
              <th>{t('demoLesson.attendance.name')}</th>
              <th />
              <th>{t('demoLesson.attendance.managerPermission')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="dl-att-empty">
                  {t('demoLesson.attendance.loading')}
                </td>
              </tr>
            ) : !lid ? (
              <tr>
                <td colSpan={4} className="dl-att-empty">
                  {t('demoLesson.attendance.notFound')}
                </td>
              </tr>
            ) : (
              <tr>
                <td>{lid.id}</td>
                <td>{fullName}</td>
                <td>
                  <span className={isPresent ? 'dl-att-status--present' : 'dl-att-status--absent'}>
                    {isPresent
                      ? t('demoLesson.attendance.present')
                      : t('demoLesson.attendance.absent')}
                  </span>
                </td>
                <td>
                  <div className="dl-att-status-cell">
                    <label className="dl-att-toggle">
                      <input
                        type="checkbox"
                        checked={isPresent}
                        onChange={(e) => setAttendanceOverride(e.target.checked)}
                      />
                      <span className="dl-att-track" />
                      <span className="dl-att-thumb" />
                    </label>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── form state ──────────────────────────────────────────────────────────────

interface FormState {
  group_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room_id: string;
  teacher_id: string;
}

const EMPTY_FORM: FormState = {
  group_id: '',
  date: '',
  start_time: '',
  end_time: '',
  room_id: '',
  teacher_id: '',
};

const PER_PAGE = 10;

// ─── page ─────────────────────────────────────────────────────────────────────

const DemoLessonPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DemoLesson | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [attendanceLessonId, setAttendanceLessonId] = useState<number | null>(null);

  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  // ── queries ──
  const { data: rawLessons, isLoading } = useQuery<
    { current_page: number; data: DemoLesson[] } | DemoLesson[]
  >({
    queryKey: ['demo-lessons'],
    queryFn: async () => {
      const res = await API.get('/demo-lessons');
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const lessons = useMemo<DemoLesson[]>(() => {
    if (!rawLessons) return [];
    if (Array.isArray(rawLessons)) return rawLessons;
    return (rawLessons as { current_page: number; data: DemoLesson[] }).data ?? [];
  }, [rawLessons]);

  const { data: rawGroups } = useQuery<Group[] | { data: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => API.get('/groups').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const groups = useMemo<Group[]>(
    () => (Array.isArray(rawGroups) ? rawGroups : ((rawGroups as { data: Group[] })?.data ?? [])),
    [rawGroups],
  );

  const { data: rawRooms } = useQuery<Room[] | { data: Room[] }>({
    queryKey: ['rooms'],
    queryFn: () => API.get('/rooms').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const rooms: Room[] = Array.isArray(rawRooms)
    ? rawRooms
    : ((rawRooms as { data: Room[] })?.data ?? []);

  const { data: rawEmployees } = useQuery<Employee[] | { data: Employee[] }>({
    queryKey: ['employees'],
    queryFn: () => API.get('/employees').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const employees: Employee[] = Array.isArray(rawEmployees)
    ? rawEmployees
    : ((rawEmployees as { data: Employee[] })?.data ?? []);

  // ── mutations ──
  const create = useCreateDemoLesson();
  const update = useUpdateDemoLesson();
  const remove = useDeleteDemoLesson();

  // ── derived ──
  const filtered = useMemo(() => {
    if (!search) return lessons;
    const s = search.toLowerCase();
    return lessons.filter(
      (l) => l.group?.name?.toLowerCase().includes(s) || l.date?.toLowerCase().includes(s),
    );
  }, [lessons, search]);

  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const employeeOptions = employees.map((e) => ({
    value: String(e.id),
    label: `${e.first_name} ${e.last_name}`,
  }));

  const isSaving = create.isPending || update.isPending;

  // ── handlers ──
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (lesson: DemoLesson) => {
    setEditing(lesson);
    setForm({
      group_id: String(lesson.group_id ?? ''),
      date: lesson.date ? apiDateToForm(lesson.date) : '',
      start_time: lesson.start_time ? lesson.start_time.slice(0, 5) : '',
      end_time: lesson.end_time ? lesson.end_time.slice(0, 5) : '',
      room_id: String(lesson.room_id ?? ''),
      teacher_id: String(lesson.teacher_id ?? ''),
    });
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm(t('demoLesson.confirmDelete'))) return;
    remove.mutate(id, {
      onSuccess: () =>
        notifications.show({
          title: t('demoLesson.notification.success'),
          message: t('demoLesson.notification.deleted'),
          color: 'green',
        }),
    });
  };

  const handleSave = () => {
    if (form.date.length !== 10) {
      notifications.show({
        title: t('demoLesson.modal.date'),
        message: t('demoLesson.notification.dateInvalid'),
        color: 'red',
      });
      return;
    }

    const payload: CreateDemoLessonPayload = {
      group_id: parseInt(form.group_id),
      date: formDateToApi(form.date),
      start_time: form.start_time,
      end_time: form.end_time,
      room_id: parseInt(form.room_id),
      teacher_id: parseInt(form.teacher_id),
    };

    if (editing) {
      update.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            notifications.show({
              title: t('demoLesson.notification.success'),
              message: t('demoLesson.notification.updated'),
              color: 'green',
            });
            setModalOpen(false);
          },
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          notifications.show({
            title: t('demoLesson.notification.success'),
            message: t('demoLesson.notification.created'),
            color: 'green',
          });
          setModalOpen(false);
        },
      });
    }
  };

  // ── render ──
  if (attendanceLessonId !== null) {
    return (
      <div className="dl-page container">
        <DemoLessonAttendanceView
          lessonId={attendanceLessonId}
          onClose={() => setAttendanceLessonId(null)}
        />
      </div>
    );
  }

  return (
    <div className="dl-page container">
      {/* ── header ── */}
      <div className="dl-header">
        <h1 className="dl-title">{t('demoLesson.title')}</h1>
        <div className="dl-controls">
          <div className="dl-search-box">
            <i className="fa-solid fa-magnifying-glass dl-search-icon" />
            <input
              type="text"
              className="dl-search-input"
              placeholder={t('demoLesson.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button className="dl-filter-btn">
            <i className="fa-solid fa-sliders" />
            {t('demoLesson.filter')}
          </button>
          <button className="dl-create-btn" onClick={openCreate}>
            {t('demoLesson.createBtn')}
          </button>
        </div>
      </div>

      {/* ── table ── */}
      <div className="dl-card">
        <table className="dl-table">
          <thead>
            <tr>
              <th>{t('demoLesson.table.id')}</th>
              <th>{t('demoLesson.table.groupName')}</th>
              <th>{t('demoLesson.table.lessonDay')}</th>
              <th>{t('demoLesson.table.startTime')}</th>
              <th>{t('demoLesson.table.endTime')}</th>
              <th>{t('demoLesson.table.room')}</th>
              <th>{t('demoLesson.table.teacher')}</th>
              <th>{t('demoLesson.table.createdAt')}</th>
              <th>{t('demoLesson.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="dl-td-empty">
                  {t('demoLesson.loading')}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="dl-td-empty">
                  {t('demoLesson.notFound')}
                </td>
              </tr>
            ) : (
              paginated.map((lesson) => (
                <tr key={lesson.id}>
                  <td>{lesson.id}</td>
                  <td>{lesson.group?.name ?? '-'}</td>
                  <td>{formatDateDisplay(lesson.date)}</td>
                  <td>{lesson.start_time ?? '-'}</td>
                  <td>{lesson.end_time ?? '-'}</td>
                  <td>{getLocalized(lesson.room, 'name', lang)}</td>
                  <td>
                    {lesson.teacher?.full_name ??
                      (lesson.teacher
                        ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}`
                        : '-')}
                  </td>
                  <td>{formatCreatedAt(lesson.created_at)}</td>
                  <td>
                    <div className="dl-actions">
                      <button
                        className="dl-action dl-action--edit"
                        title={t('demoLesson.editTitle')}
                        onClick={() => openEdit(lesson)}
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                      <button
                        className="dl-action dl-action--attendance"
                        title={t('demoLesson.attendanceTitle')}
                        onClick={() => setAttendanceLessonId(lesson.id)}
                      >
                        <i className="fa-solid fa-clipboard-list" />
                      </button>
                      <button
                        className="dl-action dl-action--delete"
                        title={t('demoLesson.deleteTitle')}
                        onClick={() => handleDelete(lesson.id)}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="dl-pagination-row">
          <Pagination page={page} lastPage={lastPage} onChange={setPage} />
        </div>
      </div>

      {/* ── modal ── */}
      {modalOpen && (
        <div
          className="dl-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="dl-modal">
            <div className="dl-modal-header">
              <span>{t('demoLesson.modal.title')}</span>
            </div>

            <div className="dl-modal-body">
              <div className="dl-form-grid">
                {/* Guruh */}
                <div className="dl-field">
                  <label className="dl-label">{t('demoLesson.modal.group')}</label>
                  <GroupSelect
                    value={form.group_id}
                    onChange={(v) => {
                      const g = groups.find((gr) => String(gr.id) === v);
                      setForm((f) => ({
                        ...f,
                        group_id: v,
                        teacher_id: g?.teacher?.id ? String(g.teacher.id) : f.teacher_id,
                      }));
                    }}
                    groups={groups}
                  />
                </div>

                {/* Sana */}
                <div className="dl-field">
                  <label className="dl-label">{t('demoLesson.modal.date')}</label>
                  <DateInput
                    value={form.date}
                    onChange={(v) => setForm((f) => ({ ...f, date: v }))}
                  />
                </div>

                {/* Boshlanish vaqti */}
                <div className="dl-field">
                  <label className="dl-label">{t('demoLesson.modal.startTime')}</label>
                  <TimeInput
                    value={form.start_time}
                    onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
                  />
                </div>

                {/* Tugash vaqti */}
                <div className="dl-field">
                  <label className="dl-label">{t('demoLesson.modal.endTime')}</label>
                  <TimeInput
                    value={form.end_time}
                    onChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
                  />
                </div>

                {/* Xona */}
                <div className="dl-field">
                  <label className="dl-label">{t('demoLesson.modal.room')}</label>
                  <RoomSelect
                    value={form.room_id}
                    onChange={(v) => setForm((f) => ({ ...f, room_id: v }))}
                    rooms={rooms}
                    groups={groups}
                    formDate={form.date}
                    startTime={form.start_time}
                    endTime={form.end_time}
                  />
                </div>

                {/* O'qituvchi */}
                <div className="dl-field">
                  <label className="dl-label">{t('demoLesson.modal.teacher')}</label>
                  <NativeSelect
                    value={form.teacher_id}
                    onChange={(v) => setForm((f) => ({ ...f, teacher_id: v }))}
                    options={employeeOptions}
                    placeholder={t('demoLesson.modal.teacherPlaceholder')}
                  />
                </div>
              </div>
            </div>

            <div className="dl-modal-footer">
              <button className="dl-btn-cancel" onClick={() => setModalOpen(false)}>
                {t('demoLesson.modal.cancel')}
              </button>
              <button className="dl-btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? t('demoLesson.modal.saving') : t('demoLesson.modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoLessonPage;
