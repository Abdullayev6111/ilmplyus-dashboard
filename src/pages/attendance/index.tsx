import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "../../api/api";
import "./attendance.css";
import { Popover, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type {
  EmployeeAttendance,
  AttendanceStatus,
  AttendanceRecord,
} from "../../types/attendance.types";

const AttendancePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isEditMode, setIsEditMode] = useState(false);

  // State for popover/modal
  const [activeCell, setActiveCell] = useState<{
    employeeId: number;
    date: string;
    currentStatus: AttendanceStatus;
    comment: string;
  } | null>(null);

  const month = selectedDate.getMonth();
  const year = selectedDate.getFullYear();

  // Translation helpers
  const monthNames = useMemo(() => [
    t("attendance.months.january"),
    t("attendance.months.february"),
    t("attendance.months.march"),
    t("attendance.months.april"),
    t("attendance.months.may"),
    t("attendance.months.june"),
    t("attendance.months.july"),
    t("attendance.months.august"),
    t("attendance.months.september"),
    t("attendance.months.october"),
    t("attendance.months.november"),
    t("attendance.months.december"),
  ], [t]);

  const dayNames = useMemo(() => [
    t("attendance.days.sun"),
    t("attendance.days.mon"),
    t("attendance.days.tue"),
    t("attendance.days.wed"),
    t("attendance.days.thu"),
    t("attendance.days.fri"),
    t("attendance.days.sat"),
  ], [t]);

  // Date Logic
  const daysInMonth = useMemo(() => {
    const daysCount = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => {
      const dayDate = new Date(year, month, i + 1);
      return {
        dayNum: i + 1,
        dayName: dayNames[dayDate.getDay()],
        fullDate: dayDate.toISOString().split("T")[0],
      };
    });
  }, [month, year, dayNames]);

  // API Calls
  const { data: apiData } = useQuery<{ data: EmployeeAttendance[] }>({
    queryKey: ["attendances", year, month],
    queryFn: async () => {
      const { data } = await API.get("/attendances", {
        params: { month: `${year}-${String(month + 1).padStart(2, "0")}` },
      });
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (records: AttendanceRecord[]) => {
      const { data } = await API.post("/attendances", { records });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendances"] });
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

  const handlePrint = () => {
    window.print();
  };

  const isPastDay = (fullDate: string) => {
    const today = new Date().toISOString().split("T")[0];
    return fullDate < today;
  };

  const handleCellClick = (employee: EmployeeAttendance, day: any) => {
    if (!isEditMode) return;
    if (!isPastDay(day.fullDate)) return; // Logic for old days only as per prompt

    const existing = employee.attendances.find((a) => a.date === day.fullDate);

    setActiveCell({
      employeeId: employee.id,
      date: day.fullDate,
      currentStatus: existing?.status || null,
      comment: existing?.comment || "",
    });
  };

  const handleSubmitStatus = (status: AttendanceStatus) => {
    if (!activeCell) return;

    const record: AttendanceRecord = {
      employee_id: activeCell.employeeId,
      date: activeCell.date,
      status: status,
      comment: activeCell.comment,
    };

    saveMutation.mutate([record]);
  };

  const getStatusDisplay = (status: AttendanceStatus) => {
    if (status === "+") return "+";
    if (status === "NB") return "NB";
    if (status === "S") return "S";
    if (status === "F") return "F";
    if (status === "K") return "K";
    return "";
  };

  const getCellClass = (status: AttendanceStatus) => {
    if (status === "+") return "status-plus";
    if (status === "NB") return "status-nb";
    if (status === "S") return "status-s";
    if (status === "F") return "status-f";
    if (status === "K") return "status-k";
    return "";
  };

  return (
    <div className="attendance-page container">
      <div className="attendance-header">
        <div className="attendance-controls">
          <div className="month-picker">
            <button className="nav-btn" onClick={handlePrevMonth}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <span>
              {monthNames[month]} {year}
            </span>
            <button className="nav-btn" onClick={handleNextMonth}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div className="action-btns">
            <button className="icon-btn" onClick={handlePrint} title={t("attendance.tooltips.print")}>
              <i className="fa-solid fa-print"></i>
            </button>
            <button
              className={`icon-btn ${isEditMode ? "edit-mode" : ""}`}
              onClick={() => setIsEditMode(!isEditMode)}
              title={t("attendance.tooltips.edit")}
            >
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>
        </div>

        <div className="legend">
          <div className="legend-item">
            <b className="status-plus">+</b> - {t("attendance.legend.present")}
          </div>
          <div className="legend-item">
            <b className="status-nb">NB</b> - {t("attendance.legend.absentNoExcuse")}
          </div>
          <div className="legend-item">
            <b className="status-s">S</b> - {t("attendance.legend.absentWithExcuse")}
          </div>
          <div className="legend-item">
            <b className="status-f">F</b> - {t("attendance.legend.noUniform")}
          </div>
          <div className="legend-item">
            <b className="status-k">K</b> - {t("attendance.legend.late")}
          </div>
        </div>
      </div>

      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="col-id">#</th>
              <th className="col-name">{t("attendance.table.fullName")}</th>
              <th className="col-position">{t("attendance.table.position")}</th>
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
            {apiData?.data.map((employee, idx) => (
              <tr key={employee.id}>
                <td>{idx + 1}</td>
                <td className="col-name">{employee.full_name}</td>
                <td className="col-position">{employee.position.name}</td>
                {daysInMonth.map((day) => {
                  const record = employee.attendances.find(
                    (a) => a.date === day.fullDate,
                  );
                  const status = record?.status || null;
                  const isPast = isPastDay(day.fullDate);

                  return (
                    <td
                      key={day.dayNum}
                      className={`attendance-cell ${isEditMode && isPast ? "editable" : ""}`}
                      onClick={() => handleCellClick(employee, day)}
                    >
                      <Popover
                        opened={
                          activeCell?.employeeId === employee.id &&
                          activeCell?.date === day.fullDate
                        }
                        onChange={() => setActiveCell(null)}
                        position="bottom"
                        withArrow
                      >
                        <Popover.Target>
                          <div
                            className={`cell-status ${getCellClass(status)}`}
                          >
                            {getStatusDisplay(status)}
                          </div>
                        </Popover.Target>
                        <Popover.Dropdown p={0}>
                          <div className="attendance-popover">
                            <div className="popover-btns">
                              {/* If K is already there, only F can be chosen. Otherwise S or F. */}
                              {status === "K" ? (
                                <>
                                  <button
                                    className="status-btn selected"
                                    disabled
                                  >
                                    K
                                  </button>
                                  <button
                                    className={`status-btn f-btn ${activeCell?.currentStatus === "F" ? "selected" : ""}`}
                                    onClick={() =>
                                      setActiveCell((prev) =>
                                        prev
                                          ? { ...prev, currentStatus: "F" }
                                          : null,
                                      )
                                    }
                                  >
                                    F
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className={`status-btn ${activeCell?.currentStatus === "S" ? "selected" : ""}`}
                                    onClick={() =>
                                      setActiveCell((prev) =>
                                        prev
                                          ? { ...prev, currentStatus: "S" }
                                          : null,
                                      )
                                    }
                                  >
                                    S
                                  </button>
                                  <button
                                    className={`status-btn f-btn ${activeCell?.currentStatus === "F" ? "selected" : ""}`}
                                    onClick={() =>
                                      setActiveCell((prev) =>
                                        prev
                                          ? { ...prev, currentStatus: "F" }
                                          : null,
                                      )
                                    }
                                  >
                                    F
                                  </button>
                                </>
                              )}
                            </div>

                            <Textarea
                              className="comment-area"
                              placeholder={t("attendance.popover.writeComment")}
                              value={activeCell?.comment}
                              onChange={(e) =>
                                setActiveCell((prev) =>
                                  prev
                                    ? { ...prev, comment: e.target.value }
                                    : null,
                                )
                              }
                              minRows={3}
                            />

                            <div className="popover-actions">
                              <button
                                className="popover-save"
                                onClick={() =>
                                  handleSubmitStatus(
                                    activeCell?.currentStatus || null,
                                  )
                                }
                                disabled={saveMutation.isPending}
                              >
                                {t("attendance.popover.save")}
                              </button>
                              <button
                                className="popover-cancel"
                                onClick={() => setActiveCell(null)}
                              >
                                {t("attendance.popover.cancel")}
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
