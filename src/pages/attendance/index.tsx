import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import './attendance.css';
import { Popover, Textarea, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type {
  EmployeeAttendance,
  AttendanceStatus,
  AttendanceStatusKey,
  AttendanceRecord,
  FlatAttendanceRecord,
} from '../../types/attendance.types';
import { useEmployees } from '../../hooks/useSharedQueries';

const AttendancePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // State for popover/modal
  const [activeCell, setActiveCell] = useState<{
    recordId?: number;
    employeeId: number;
    employeeName: string;
    date: string;
    currentStatuses: AttendanceStatusKey[];
    comment: string;
  } | null>(null);

  const month = selectedDate.getMonth();
  const year = selectedDate.getFullYear();

  useEffect(() => {
    setPickerYear(year);
  }, [year]);

  useEffect(() => {
    if (!showDatePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  // Translation helpers
  const monthNames = useMemo(
    () => [
      t('attendance.months.january'),
      t('attendance.months.february'),
      t('attendance.months.march'),
      t('attendance.months.april'),
      t('attendance.months.may'),
      t('attendance.months.june'),
      t('attendance.months.july'),
      t('attendance.months.august'),
      t('attendance.months.september'),
      t('attendance.months.october'),
      t('attendance.months.november'),
      t('attendance.months.december'),
    ],
    [t],
  );

  const dayNames = useMemo(
    () => [
      t('attendance.days.sun'),
      t('attendance.days.mon'),
      t('attendance.days.tue'),
      t('attendance.days.wed'),
      t('attendance.days.thu'),
      t('attendance.days.fri'),
      t('attendance.days.sat'),
    ],
    [t],
  );

  const daysInMonth = useMemo(() => {
    const daysCount = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => {
      const dayDate = new Date(year, month, i + 1);
      const yearStr = year;
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(i + 1).padStart(2, '0');
      return {
        dayNum: i + 1,
        dayName: dayNames[dayDate.getDay()],
        fullDate: `${yearStr}-${monthStr}-${dayStr}`,
      };
    });
  }, [month, year, dayNames]);

  const { data: attendanceData } = useQuery<{ data: FlatAttendanceRecord[] }>({
    queryKey: ['attendances', year, month],
    queryFn: async () => {
      const { data } = await API.get('/attendances', {
        params: { month: `${year}-${String(month + 1).padStart(2, '0')}` },
      });
      return data;
    },
  });

  const { data: employeesData } = useEmployees();

  const employeesWithAttendances = useMemo(() => {
    const flatRecords = attendanceData?.data || [];
    const employees = employeesData || [];

    // Seed table with ALL employees so empty-month rows are still shown
    const groupedById: Record<number, EmployeeAttendance> = {};
    // Build a name → id lookup so attendance records (which lack employee_id) can be matched.
    // Index by both full name and first-two-word variant because the API may return
    // shortened names ("Batirova Khurshida") while /employees has full names
    // ("Batirova Khurshida Hamidovna").
    const nameToId: Record<string, number> = {};
    employees.forEach((e) => {
      groupedById[e.id] = {
        id: e.id,
        full_name: e.label,
        position: null,
        attendances: [],
      };
      nameToId[e.label] = e.id;
      const twoWord = e.label.split(' ').slice(0, 2).join(' ');
      if (twoWord && !nameToId[twoWord]) nameToId[twoWord] = e.id;
    });

    // Overlay attendance records — match by employee_id when present, otherwise by name
    flatRecords.forEach((r) => {
      const empId: number | undefined = r.employee_id ?? nameToId[r.employee];
      if (empId == null) return;

      if (!groupedById[empId]) {
        groupedById[empId] = {
          id: empId,
          full_name: r.employee,
          position: r.position || null,
          attendances: [],
        };
      } else if (r.position && !groupedById[empId].position) {
        groupedById[empId].position = r.position;
      }

      const currentStatuses = (Array.isArray(r.status) ? r.status : [r.status]).filter(
        (s): s is AttendanceStatusKey => s !== null,
      );

      const mappedStatuses = currentStatuses.map((s) => {
        if (s === 'present') return '+';
        if (s === 'absent') return 'NB';
        if (s === 'late') return 'K';
        if (s === 'excused') return 'S';
        if (s === 'no_uniform') return 'F';
        return s;
      }) as AttendanceStatusKey[];

      groupedById[empId].attendances.push({
        id: r.id,
        employee_id: empId,
        date: r.date,
        status: mappedStatuses,
        comment_uz: r.comment || '',
        check_in: r.check_in,
        check_out: r.check_out,
      });
    });

    return Object.values(groupedById);
  }, [attendanceData, employeesData]);

  const saveMutation = useMutation({
    mutationFn: async (records: AttendanceRecord[]) => {
      // If we are updating a single existing record
      if (activeCell?.recordId) {
        const record = records[0];
        const { data } = await API.put(`/attendances/${activeCell.recordId}`, record);
        return data;
      }
      // Send the single record directly (backend expects flat fields at root)
      const { data } = await API.post('/attendances', records[0]);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      setActiveCell(null);
    },
  });

  // Handlers
  const handlePrevMonth = () => {
    setSelectedDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(year, month + 1, 1));
  };

  const handleMonthSelect = (monthIdx: number) => {
    setSelectedDate(new Date(pickerYear, monthIdx, 1));
    setShowDatePicker(false);
  };

  const handleClearFilter = () => {
    setSelectedDate(new Date());
    setShowDatePicker(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const isPastDay = (fullDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    return fullDate <= today;
  };

  const handleCellClick = (employee: EmployeeAttendance, day: any) => {
    if (!isEditMode) return;

    const dayRecords = employee.attendances.filter((a) => a.date === day.fullDate);
    const existing = dayRecords[dayRecords.length - 1];

    // Extract current statuses from existing record and deduplicate
    let currentStatuses: AttendanceStatusKey[] = [];
    if (existing) {
      if (Array.isArray(existing.status)) {
        currentStatuses = [
          ...new Set(existing.status.filter((s): s is AttendanceStatusKey => s !== null)),
        ];
      } else if (existing.status) {
        currentStatuses = [existing.status as AttendanceStatusKey];
      }
    }

    setActiveCell({
      recordId: existing?.id,
      employeeId: employee.id,
      employeeName: employee.full_name,
      date: day.fullDate,
      currentStatuses,
      comment: existing?.comment_uz || '',
    });
  };

  const handleSubmitStatus = () => {
    if (!activeCell) return;
    if (activeCell.currentStatuses.length === 0) return;

    // Map internal codes back to backend-friendly verbose strings
    const backendStatuses = activeCell.currentStatuses.map((s) => {
      if (s === '+') return 'present';
      if (s === 'NB') return 'absent';
      if (s === 'K') return 'late';
      if (s === 'S') return 'excused';
      if (s === 'F') return 'no_uniform';
      return s;
    });

    const now = new Date();
    const checkIn = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const record: AttendanceRecord = {
      employee_id: activeCell.employeeId,
      date: activeCell.date,
      check_in: checkIn,
      status: backendStatuses,
      comment_uz: activeCell.comment,
    };

    saveMutation.mutate([record]);
  };

  const toggleStatus = (status: AttendanceStatusKey) => {
    if (!activeCell) return;

    setActiveCell((prev) => {
      if (!prev) return null;
      let newStatuses = [...prev.currentStatuses];

      if (status === 'NB' || status === 'S') {
        // Mutual exclusion for Absent/Excused
        newStatuses = newStatuses.includes(status) ? [] : [status];
      } else {
        // Remove Absent/Excused if toggling others
        newStatuses = newStatuses.filter((s) => s !== 'NB' && s !== 'S');

        if (status === '+' || status === 'K') {
          // Mutual exclusion between Present and Late
          const other = status === '+' ? 'K' : '+';
          newStatuses = newStatuses.filter((s) => s !== other);

          if (newStatuses.includes(status)) {
            newStatuses = newStatuses.filter((s) => s !== status);
          } else {
            newStatuses.push(status);
          }
        } else if (status === 'F') {
          // Toggle Formasiz
          if (newStatuses.includes('F')) {
            newStatuses = newStatuses.filter((s) => s !== 'F');
          } else {
            newStatuses.push('F');
          }
        }
      }

      return { ...prev, currentStatuses: newStatuses };
    });
  };

  const renderStatuses = (status: AttendanceStatus | string[] | null) => {
    if (!status) return null;
    const statuses = Array.isArray(status) ? status : [status];

    if (statuses.includes('NB')) return <span className="status-nb">NB</span>;
    if (statuses.includes('S')) return <span className="status-s">S</span>;

    const elements = [];
    if (statuses.includes('+'))
      elements.push(
        <span key="+" className="status-plus">
          +
        </span>,
      );
    if (statuses.includes('K'))
      elements.push(
        <span key="K" className="status-k">
          K
        </span>,
      );
    if (statuses.includes('F'))
      elements.push(
        <span key="F" className="status-f">
          F
        </span>,
      );

    return elements;
  };

  return (
    <div className="attendance-page container">
      <div className="attendance-header">
        <div className="attendance-controls">
          <div className="month-picker-container" ref={datePickerRef}>
            <div className="month-picker">
              <button className="nav-btn" onClick={handlePrevMonth}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="month-picker-label" onClick={() => setShowDatePicker((v) => !v)}>
                {monthNames[month]} {year}
              </span>
              <button className="nav-btn" onClick={handleNextMonth}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {showDatePicker && (
              <div className="date-picker-dropdown">
                <div className="date-picker-year-row">
                  <button className="dp-nav-btn" onClick={() => setPickerYear((y) => y - 1)}>
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <select
                    className="dp-year-select"
                    value={pickerYear}
                    onChange={(e) => setPickerYear(Number(e.target.value))}
                  >
                    {Array.from({ length: 16 }, (_, i) => 2020 + i).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <button className="dp-nav-btn" onClick={() => setPickerYear((y) => y + 1)}>
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>

                <div className="date-picker-months">
                  {monthNames.map((name, idx) => (
                    <button
                      key={idx}
                      className={`dp-month-btn ${idx === month && pickerYear === year ? 'dp-month-active' : ''}`}
                      onClick={() => handleMonthSelect(idx)}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <button className="dp-clear-btn" onClick={handleClearFilter}>
                  {t('attendance.clearFilter')}
                </button>
              </div>
            )}
          </div>

          <div className="action-btns">
            <button
              className="icon-btn"
              onClick={handlePrint}
              title={t('attendance.tooltips.print')}
            >
              <i className="fa-solid fa-print"></i>
            </button>
            <button
              className={`icon-btn ${isEditMode ? 'edit-mode' : ''}`}
              onClick={() => setIsEditMode(!isEditMode)}
              title={t('attendance.tooltips.edit')}
            >
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>
        </div>

        <div className="legend">
          <div className="legend-item">
            <b className="status-plus">+</b> - {t('attendance.legend.present')}
          </div>
          <div className="legend-item">
            <b className="status-nb">NB</b> - {t('attendance.legend.absentNoExcuse')}
          </div>
          <div className="legend-item">
            <b className="status-s">S</b> - {t('attendance.legend.absentWithExcuse')}
          </div>
          <div className="legend-item">
            <b className="status-f">F</b> - {t('attendance.legend.noUniform')}
          </div>
          <div className="legend-item">
            <b className="status-k">K</b> - {t('attendance.legend.late')}
          </div>
        </div>
      </div>

      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th className="col-name">{t('attendance.table.fullName')}</th>
              <th className="col-position">{t('attendance.table.position')}</th>
              {daysInMonth.map((day) => (
                <th key={day.dayNum} className="col-day">
                  <div className="day-header">
                    <span className="day-name">{day.dayName}</span>
                    <span className="day-num">{day.dayNum}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employeesWithAttendances.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.id}</td>
                <td className="col-name">{employee?.full_name}</td>
                <td className="col-position">{employee?.position}</td>
                {daysInMonth.map((day) => {
                  const dayRecords =
                    employee?.attendances?.filter((a) => a.date === day.fullDate) || [];

                  const allStatuses = dayRecords.reduce((acc, r) => {
                    r.status.forEach((s) => {
                      if (!acc.includes(s)) acc.push(s);
                    });
                    return acc;
                  }, [] as string[]);

                  const status = allStatuses.length > 0 ? allStatuses : null;
                  const isPast = isPastDay(day.fullDate);

                  // Create tooltip label combining all records
                  const tooltipContent = dayRecords
                    .map((r) => {
                      const parts = [];
                      if (r.check_in) parts.push(`${r.check_in} - ${r.check_out || ''}`);
                      if (r.comment) parts.push(`${r.comment}`);
                      return parts.join(' | ');
                    })
                    .filter(Boolean)
                    .join('\\n');

                  return (
                    <td
                      key={day.dayNum}
                      className={`attendance-cell ${isEditMode && isPast ? 'editable' : ''}`}
                      onClick={() => handleCellClick(employee, day)}
                    >
                      <Popover
                        opened={
                          activeCell?.employeeId === employee.id &&
                          activeCell?.employeeName === employee.full_name &&
                          activeCell?.date === day.fullDate
                        }
                        onChange={() => setActiveCell(null)}
                        position="bottom"
                        withArrow
                      >
                        <Popover.Target>
                          <div className="tooltip-wrapper">
                            <Tooltip
                              label={tooltipContent}
                              disabled={!tooltipContent}
                              position="top"
                              withArrow
                              multiline
                            >
                              <div className="cell-status">{renderStatuses(status as any)}</div>
                            </Tooltip>
                          </div>
                        </Popover.Target>
                        <Popover.Dropdown p={0} onClick={(e) => e.stopPropagation()}>
                          <div className="attendance-popover">
                            <div className="popover-btns">
                              {activeCell?.currentStatuses.some(
                                (s) => s !== 'no_uniform' && s !== 'F',
                              ) ? (
                                (() => {
                                  const primary = activeCell.currentStatuses.find(
                                    (s) => s !== 'no_uniform' && s !== 'F',
                                  );
                                  return (
                                    <>
                                      <button
                                        className="status-btn selected"
                                        disabled
                                        type="button"
                                      >
                                        {primary === 'absent'
                                          ? 'NB'
                                          : primary === 'present'
                                            ? '+'
                                            : primary === 'late'
                                              ? 'K'
                                              : primary === 'excused'
                                                ? 'S'
                                                : primary}
                                      </button>
                                      <button
                                        type="button"
                                        className={`status-btn f-btn ${activeCell.currentStatuses.includes('F') || activeCell.currentStatuses.includes('no_uniform') ? 'selected' : ''}`}
                                        onClick={() => toggleStatus('F')}
                                      >
                                        F
                                      </button>
                                    </>
                                  );
                                })()
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className={`status-btn ${activeCell?.currentStatuses.includes('+') ? 'selected' : ''}`}
                                    onClick={() => toggleStatus('+')}
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-btn k-btn ${activeCell?.currentStatuses.includes('K') ? 'selected' : ''}`}
                                    onClick={() => toggleStatus('K')}
                                  >
                                    K
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-btn f-btn ${activeCell?.currentStatuses.includes('F') ? 'selected' : ''}`}
                                    onClick={() => toggleStatus('F')}
                                  >
                                    F
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-btn nb-btn ${activeCell?.currentStatuses.includes('NB') ? 'selected' : ''}`}
                                    onClick={() => toggleStatus('NB')}
                                  >
                                    NB
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-btn s-btn ${activeCell?.currentStatuses.includes('S') ? 'selected' : ''}`}
                                    onClick={() => toggleStatus('S')}
                                  >
                                    S
                                  </button>
                                </>
                              )}
                            </div>

                            <Textarea
                              className="comment-area"
                              placeholder={t('attendance.popover.writeComment')}
                              value={activeCell?.comment}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setActiveCell((prev) =>
                                  prev ? { ...prev, comment: e.target.value } : null,
                                )
                              }
                              minRows={3}
                            />

                            <div className="popover-actions">
                              <button
                                type="button"
                                className="popover-save"
                                onClick={handleSubmitStatus}
                                disabled={saveMutation.isPending}
                              >
                                {t('attendance.popover.save')}
                              </button>
                              <button
                                type="button"
                                className="popover-cancel"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCell(null);
                                }}
                              >
                                {t('attendance.popover.cancel')}
                              </button>
                            </div>
                          </div>
                        </Popover.Dropdown>
                      </Popover>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendancePage;
