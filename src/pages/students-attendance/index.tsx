import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API } from '../../api/api';
import './studentsAttendance.css';
import type {
  Attendance,
  GroupData,
  MonthlyAttendanceResponse,
  PopoverState,
  Student,
  StudentsResponse,
} from '@/types/studentsAttendance.types';
import type { Group } from '../../types/groups.types';

const DAY_SHORT: Record<string, string> = {
  monday: 'Du', tuesday: 'Se', wednesday: 'Ch',
  thursday: 'Pa', friday: 'Ju', saturday: 'Sh', sunday: 'Ya',
};

const DAY_INDEX: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

const AttendanceDot = memo(
  ({
    status,
    grade,
    onClick,
  }: {
    status?: Attendance['status'];
    grade?: number;
    onClick: () => void;
  }) => {
    let className = 'attendance-dot dot-empty';
    if (status === 'present') className = 'attendance-dot dot-present';
    if (status === 'absent') className = 'attendance-dot dot-absent';
    if (status === 'late') className = 'attendance-dot dot-late';
    if (status === 'reason') className = 'attendance-dot dot-reason';

    return (
      <div className={className} onClick={onClick}>
        {grade !== undefined && <span className="grade-value">{grade}</span>}
      </div>
    );
  },
);

const Popover = ({
  attendance,
  onSave,
  onCancel,
  onDelete,
}: {
  attendance: PopoverState;
  onSave: (data: PopoverState) => void;
  onCancel: () => void;
  onDelete: () => void;
}) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Attendance['status'] | undefined>(attendance.status);
  const [grade, setGrade] = useState<number | undefined>(attendance.grade);
  const [comment, setComment] = useState<string>(attendance.comment_uz ?? '');

  const handleSave = () => {
    if (!status) return;
    onSave({ ...attendance, status, grade, comment_uz: comment });
  };

  return (
    <div className="popover-overlay" onClick={onCancel}>
      <div className="attendance-popover" onClick={(e) => e.stopPropagation()}>
        <div className="popover-section">
          <span className="popover-title">{t('studentsAttendance.davomat')}:</span>
          <div className="davomat-options">
            {(['present', 'absent', 'late', 'reason'] as const).map((opt) => (
              <button
                key={opt}
                className={`option-btn${status === opt ? ' active' : ''}`}
                onClick={() => setStatus(opt)}
              >
                <div className={`legend-dot dot-${opt}`} />
                {t(`studentsAttendance.${opt}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="popover-section">
          <span className="popover-title">{t('studentsAttendance.baho')}:</span>
          <div className="grade-input-wrap">
            <input
              type="number"
              className="grade-field"
              value={grade ?? ''}
              onChange={(e) => setGrade(e.target.value === '' ? undefined : Number(e.target.value))}
            />
          </div>
        </div>

        {status === 'reason' && (
          <div className="popover-section">
            <span className="popover-title">{t('studentsAttendance.reason_label')}:</span>
            <textarea
              className="reason-field"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}

        <div className="popover-actions">
          {attendance.id && (
            <button className="pop-cancel" style={{ color: 'red' }} onClick={onDelete}>
              {t('studentsAttendance.delete')}
            </button>
          )}
          <button className="pop-cancel" onClick={onCancel}>
            {t('studentsAttendance.cancel')}
          </button>
          <button className="pop-save" onClick={handleSave}>
            {t('studentsAttendance.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

const GroupSelector: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data } = useQuery<{ data: Group[] }>({
    queryKey: ['groups', 'all'],
    queryFn: () => API.get('/groups', { params: { limit: 1000 } }).then((res) => res.data),
  });

  const groups: Group[] = data?.data ?? [];

  const filtered = groups.filter((g) =>
    g.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const formatDate = (d?: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
  };

  return (
    <div className="group-selector-wrap">
      <div className="group-selector-header">
        <h2 className="group-selector-title">Guruhni tanlang</h2>
        <input
          className="group-selector-search"
          placeholder="Guruh qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="group-cards-grid">
        {filtered.map((g) => (
          <div
            key={g.id}
            className="group-card"
            onClick={() => navigate(`/students-attendance?groupId=${g.id}`)}
          >
            <div className="group-card__header">
              <span className="group-card__title">Guruh: {g.name}</span>
              {g.start_date && (
                <span className="group-card__date-badge">{formatDate(g.start_date)}</span>
              )}
            </div>
            <div className="group-card__grid">
              <div className="group-card__item">
                <div className="group-card__item-icon">
                  <i className="fa-solid fa-users" />
                </div>
                <div className="group-card__item-content">
                  <span className="group-card__item-label">O'quvchilar soni</span>
                  <span className="group-card__item-value">
                    {g.students_count ?? g.max_students ?? 0} o'quvchi
                  </span>
                </div>
              </div>

              <div className="group-card__item">
                <div className="group-card__item-icon">
                  <i className="fa-solid fa-chart-bar" />
                </div>
                <div className="group-card__item-content">
                  <span className="group-card__item-label">Bosqich</span>
                  <span className="group-card__item-value">
                    {g.level?.name_uz ?? '—'}
                  </span>
                </div>
              </div>

              <div className="group-card__item">
                <div className="group-card__item-icon">
                  <i className="fa-regular fa-clock" />
                </div>
                <div className="group-card__item-content">
                  <span className="group-card__item-label">Dars vaqti</span>
                  <span className="group-card__item-value">
                    {g.start_time?.slice(0, 5)} - {g.end_time?.slice(0, 5)}
                  </span>
                </div>
              </div>

              <div className="group-card__item">
                <div className="group-card__item-icon">
                  <i className="fa-regular fa-calendar" />
                </div>
                <div className="group-card__item-content">
                  <span className="group-card__item-label">Dars kunlari</span>
                  <span className="group-card__item-value">
                    {g.days?.map((d) => DAY_SHORT[d] ?? d).join(', ') ?? '—'}
                  </span>
                </div>
              </div>

              <div className="group-card__item">
                <div className="group-card__item-icon">
                  <i className="fa-regular fa-building" />
                </div>
                <div className="group-card__item-content">
                  <span className="group-card__item-label">Xona</span>
                  <span className="group-card__item-value">
                    {g.room ? `${g.room.floor} qavat ${g.room.name_uz ?? g.room.name}` : '—'}
                  </span>
                </div>
              </div>

              <div className="group-card__item">
                <div className="group-card__item-icon">
                  <i className="fa-solid fa-book-open" />
                </div>
                <div className="group-card__item-content">
                  <span className="group-card__item-label">Kurs</span>
                  <span className="group-card__item-value">
                    {g.course?.name_uz ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p style={{ color: '#888', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
            Guruhlar topilmadi
          </p>
        )}
      </div>
    </div>
  );
};

const StudentsAttendance: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');

  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedCell, setSelectedCell] = useState<{
    studentId: number;
    date: string;
    attendance?: Attendance;
  } | null>(null);

  const { data: studentsData } = useQuery<StudentsResponse>({
    queryKey: ['students', groupId],
    queryFn: (): Promise<StudentsResponse> =>
      API.get('/students').then((res) => {
        const all: Student[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        return {
          data: all.filter((s) => s.groups?.some((g: { id: number }) => String(g.id) === String(groupId))),
        };
      }),
    enabled: !!groupId,
  });

  const { data: groupData } = useQuery<GroupData>({
    queryKey: ['group', groupId],
    queryFn: () => API.get(`/groups/${groupId}`).then((res) => res.data.data ?? res.data),
    enabled: !!groupId,
  });

  const { data: attendanceData } = useQuery<MonthlyAttendanceResponse>({
    queryKey: ['student_attendance', 'monthly', groupId, currentYear, currentMonth],
    queryFn: () =>
      API.get('/student_attendance/monthly', {
        params: {
          group_id: groupId,
          year: currentYear,
          month: currentMonth + 1,
        },
      }).then((res) => res.data),
    enabled: !!groupId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Attendance) => API.post('/student_attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_attendance'] });
      setSelectedCell(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Attendance) => API.put(`/student_attendance/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_attendance'] });
      setSelectedCell(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => API.delete(`/student_attendance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_attendance'] });
      setSelectedCell(null);
    },
  });

  const lessonDatesInMonth = useMemo(() => {
    if (!groupData?.days) return [];
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lessonDays = groupData.days.map((d: string) => DAY_INDEX[d.toLowerCase()]);
    const result: number[] = [];
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day);
      if (lessonDays.includes(date.getDay())) {
        result.push(day);
      }
    }
    return result;
  }, [currentYear, currentMonth, groupData]);

  const getWeekday = useCallback(
    (day: number) => {
      const date = new Date(currentYear, currentMonth, day);
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      return t(`studentsAttendance.weekdays.${dayNames[date.getDay()]}`);
    },
    [currentYear, currentMonth, t],
  );

  const handleCellClick = useCallback(
    (studentId: number, day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const attendance = (attendanceData?.[studentId] || []).find((a) =>
        String(a.date).startsWith(dateStr),
      );
      setSelectedCell({ studentId, date: dateStr, attendance });
    },
    [attendanceData, currentYear, currentMonth],
  );

  if (!groupId) return <GroupSelector />;

  const handleSaveAttendance = (data: PopoverState) => {
    if (!data.status) return;

    const payload: Attendance = {
      student_id: selectedCell?.studentId ?? 0,
      group_id: Number(groupId),
      date: selectedCell?.date ?? '',
      status: data.status,
      score: data.grade,
      comment_uz: data.comment_uz ?? '',
    };

    if (data.id) {
      updateMutation.mutate({ ...payload, id: data.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteAttendance = () => {
    if (selectedCell?.attendance?.id) {
      deleteMutation.mutate(selectedCell.attendance.id);
    }
  };

  const monthKeys = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sept', 'oct', 'nov', 'dec',
  ];

  const popoverAttendance: PopoverState = selectedCell?.attendance
    ? {
        id: selectedCell.attendance.id,
        student_id: selectedCell.attendance.student_id,
        group_id: selectedCell.attendance.group_id,
        date: selectedCell.attendance.date,
        status: selectedCell.attendance.status,
        grade: selectedCell.attendance.score,
        comment_uz: selectedCell.attendance.comment_uz,
      }
    : {
        student_id: selectedCell?.studentId ?? 0,
        group_id: Number(groupId),
        date: selectedCell?.date ?? '',
      };

  return (
    <div className="attendance-container container">
      <div className="attendance-header">
        <div className="attendance-controls">
          <div className="year-selector">
            <button className="year-btn" onClick={() => setCurrentYear((p) => p - 1)}>
              ‹
            </button>
            <span className="year-display">{currentYear}</span>
            <button className="year-btn" onClick={() => setCurrentYear((p) => p + 1)}>
              ›
            </button>
          </div>
          <div className="month-pills">
            {monthKeys.map((m, idx) => (
              <button
                key={m}
                className={`month-pill${currentMonth === idx ? ' active' : ''}`}
                onClick={() => setCurrentMonth(idx)}
              >
                {t(`studentsAttendance.months.${m}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="attendance-legend">
          <div className="legend-item">
            <div className="legend-dot dot-present" />
            {t('studentsAttendance.present')}
          </div>
          <div className="legend-item">
            <div className="legend-dot dot-absent" />
            {t('studentsAttendance.absent')}
          </div>
          <div className="legend-item">
            <div className="legend-dot dot-late" />
            {t('studentsAttendance.late')}
          </div>
          <div className="legend-item">
            <div className="legend-dot dot-reason" />
            {t('studentsAttendance.reason')}
          </div>
        </div>
      </div>

      <div className="desktop-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="student-col-header">FISH</th>
              {lessonDatesInMonth.map((day) => (
                <th key={day} className="attendance-col-header">
                  <div className="weekday-header">{getWeekday(day)}</div>
                  <div className="date-header">{day}</div>
                </th>
              ))}
              <th className="balance-col-header">{t('studentsAttendance.oquvchi_balansi')}</th>
            </tr>
          </thead>
          <tbody>
            {studentsData?.data?.map((student) => (
              <tr key={student.id}>
                <td className="student-info-cell">
                  <div className="student-info-inner">
                    <img
                      src={`https://ui-avatars.com/api/?name=${student.first_name}+${student.last_name}`}
                      alt="avatar"
                      className="avatar"
                    />
                    <div className="student-text">
                      <span className="student-name">
                        {student.first_name} {student.last_name}
                      </span>
                      <span className="student-phone">{student.phone}</span>
                    </div>
                    <div
                      className={`status-badge status-${student?.status === 'Noaktiv' ? 'noaktiv' : 'aktiv'}`}
                    >
                      {t(
                        `studentsAttendance.${student?.status === 'Noaktiv' ? 'noaktiv' : 'aktiv'}`,
                      )}
                    </div>
                  </div>
                </td>
                {lessonDatesInMonth.map((day) => {
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const att = (attendanceData?.[student.id] || []).find((a) =>
                    String(a.date).startsWith(dateStr),
                  );
                  return (
                    <td key={day} className="attendance-cell">
                      <AttendanceDot
                        status={att?.status}
                        grade={att?.score}
                        onClick={() => handleCellClick(student.id, day)}
                      />
                    </td>
                  );
                })}
                <td className="balance-info">
                  <div className="id-text">
                    {t('studentsAttendance.id')}: {student.id}
                  </div>
                  <div className="last-payment">{student.last_payment_date}</div>
                  <div
                    className={`balance-text ${student.balance < 0 ? 'balance-red' : 'balance-green'}`}
                  >
                    Balans: {student?.balance?.toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-cards">
        {studentsData?.data?.map((student) => (
          <div key={student.id} className="student-card">
            <div className="card-header">
              <img
                src={`https://ui-avatars.com/api/?name=${student.first_name}+${student.last_name}`}
                alt="avatar"
                className="avatar"
              />
              <div className="student-text">
                <span className="student-name">
                  {student.first_name} {student.last_name}
                </span>
                <span className="student-phone">{student.phone}</span>
              </div>
              <div
                className={`status-badge status-${student?.status === 'Noaktiv' ? 'noaktiv' : 'aktiv'}`}
              >
                {t(`studentsAttendance.${student?.status === 'Noaktiv' ? 'noaktiv' : 'aktiv'}`)}
              </div>
            </div>
            <div className="card-body">
              <div className="card-attendance-grid">
                {lessonDatesInMonth.map((day) => {
                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const att = (attendanceData?.[student.id] || []).find((a) =>
                    String(a.date).startsWith(dateStr),
                  );
                  return (
                    <div key={day} className="card-day-col">
                      <span className="card-weekday">{getWeekday(day)}</span>
                      <span className="card-date">{day}</span>
                      <AttendanceDot
                        status={att?.status}
                        grade={att?.score}
                        onClick={() => handleCellClick(student.id, day)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="card-footer">
                <span
                  className={`balance-text ${student?.balance < 0 ? 'balance-red' : 'balance-green'}`}
                >
                  Balans: {student?.balance?.toLocaleString()}
                </span>
                <span className="id-text">
                  {t('studentsAttendance.id')}: {student.id}
                </span>
                <span className="last-payment">{student.last_payment_date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>


      {selectedCell && (
        <Popover
          attendance={popoverAttendance}
          onSave={handleSaveAttendance}
          onCancel={() => setSelectedCell(null)}
          onDelete={handleDeleteAttendance}
        />
      )}
    </div>
  );
};

export default StudentsAttendance;
