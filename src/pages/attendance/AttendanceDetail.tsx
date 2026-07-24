import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import './attendance.css';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import { Protected } from '../../components/Protected';
import { getLocalized } from '../../utils/getLocalized';
import type { FlatAttendanceRecord } from '../../types/attendance.types';
import {
  STATUS_CODES,
  toStatusCode,
  toBackendStatus,
  statusLabelKey,
  shortTime,
  durationBetween,
  monthRange,
  type StatusCode,
} from './attendance.utils';

interface DayRow {
  date: string;
  ins: string[];
  outs: string[];
  /** Kirish–chiqish juftliklari: har bir kirish keyingi chiqish bilan bir qatorda */
  pairs: { in: string | null; out: string | null }[];
  statuses: StatusCode[];
  comments: string[];
}

/** Vaqt bo'yicha tartiblangan kirish/chiqishlarni juftlarga ajratadi */
const buildPairs = (ins: string[], outs: string[]) => {
  const punches = [
    ...ins.map((time) => ({ time, type: 'in' as const })),
    ...outs.map((time) => ({ time, type: 'out' as const })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const pairs: { in: string | null; out: string | null }[] = [];

  punches.forEach((p) => {
    const last = pairs[pairs.length - 1];
    if (p.type === 'in') {
      pairs.push({ in: p.time, out: null });
    } else if (last && last.out === null) {
      last.out = p.time;
    } else {
      pairs.push({ in: null, out: p.time });
    }
  });

  return pairs;
};

interface EditState {
  id: number;
  employeeId: number;
  date: string;
  time: string;
  type: 'in' | 'out';
  statuses: StatusCode[];
  comment: string;
}

const AttendanceDetail = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  // Default: oxirgi yozuv birinchi
  const [sortAsc, setSortAsc] = useState(false);

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

  const records = useMemo(
    () =>
      (data?.data || [])
        .filter((r) => String(r.employee_id) === employeeId)
        .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id)),
    [data?.data, employeeId, sortAsc],
  );

  const employee = records[0];

  const days = useMemo(() => {
    const byDate: Record<string, DayRow> = {};

    records.forEach((r) => {
      const row = (byDate[r.date] ??= {
        date: r.date,
        ins: [],
        outs: [],
        pairs: [],
        statuses: [],
        comments: [],
      });

      const time = shortTime(r.time || r.check_in);
      if (time) {
        if (r.type === 'out') row.outs.push(time);
        else row.ins.push(time);
      }

      (Array.isArray(r.status) ? r.status : []).forEach((s) => {
        const code = toStatusCode(s);
        if (code && !row.statuses.includes(code)) row.statuses.push(code);
      });

      if (r.comment && !row.comments.includes(r.comment)) row.comments.push(r.comment);
    });

    return Object.values(byDate)
      .map((row) => {
        const ins = [...row.ins].sort();
        const outs = [...row.outs].sort();
        return { ...row, ins, outs, pairs: buildPairs(ins, outs) };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const summary = useMemo(() => {
    const toMin = (x: string) => {
      const [h, m] = x.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const workedMinutes = days.reduce((acc, d) => {
      const first = d.ins[0];
      const last = d.outs[d.outs.length - 1];
      if (!first || !last) return acc;
      const diff = toMin(last) - toMin(first);
      return diff > 0 ? acc + diff : acc;
    }, 0);

    return {
      days: days.length,
      late: days.filter((d) => d.statuses.includes('K')).length,
      absent: days.filter((d) => d.statuses.includes('NB')).length,
      hours: `${Math.floor(workedMinutes / 60)}s ${workedMinutes % 60}d`,
    };
  }, [days]);

  const updateMutation = useMutation({
    mutationFn: async (rec: EditState) => {
      const { data } = await API.put(`/attendances/${rec.id}`, {
        employee_id: rec.employeeId,
        date: rec.date,
        time: rec.time,
        type: rec.type,
        status: rec.statuses.map(toBackendStatus),
        comment: rec.comment,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/attendances/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      setDeleteId(null);
    },
  });

  const openEdit = (r: FlatAttendanceRecord) =>
    setEditing({
      id: r.id,
      employeeId: r.employee_id ?? Number(employeeId),
      date: r.date,
      time: (r.time || r.check_in || '').slice(0, 8),
      type: r.type === 'out' ? 'out' : 'in',
      statuses: (Array.isArray(r.status) ? r.status : [])
        .map(toStatusCode)
        .filter((s): s is StatusCode => s !== null),
      comment: r.comment || '',
    });

  const toggleEditStatus = (code: StatusCode) =>
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            statuses: prev.statuses.includes(code)
              ? prev.statuses.filter((s) => s !== code)
              : [...prev.statuses, code],
          }
        : prev,
    );

  const formatDate = (d: string) => d.split('-').reverse().join('.');

  return (
    <section className="attendance-page container">
      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal-title">{t('attendance.editTitle')}</h3>

            <div className="attendance-edit-grid">
              <div className="form-group">
                <label>{t('attendance.table.date')}</label>
                <input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t('attendance.detail.comment')}</label>
                <textarea
                  className="comment-area"
                  rows={3}
                  value={editing.comment}
                  onChange={(e) => setEditing({ ...editing, comment: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>{t('attendance.table.time')}</label>
                <input
                  type="time"
                  step={1}
                  value={editing.time}
                  onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>{t('attendance.table.type')}</label>
              <div className="toggle-buttons">
                <button
                  type="button"
                  className={editing.type === 'in' ? 'active' : ''}
                  onClick={() => setEditing({ ...editing, type: 'in' })}
                >
                  {t('attendance.type.in')}
                </button>
                <button
                  type="button"
                  className={editing.type === 'out' ? 'active' : ''}
                  onClick={() => setEditing({ ...editing, type: 'out' })}
                >
                  {t('attendance.type.out')}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>{t('attendance.table.status')}</label>
              <div className="popover-btns">
                {STATUS_CODES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`status-btn ${editing.statuses.includes(code) ? 'selected' : ''}`}
                    onClick={() => toggleEditStatus(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="primary"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(editing)}
              >
                {updateMutation.isPending
                  ? t('attendance.popover.saving')
                  : t('attendance.popover.save')}
              </button>
              <button className="cancel" onClick={() => setEditing(null)}>
                {t('attendance.popover.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('attendance.confirmDelete')}</h3>

            <div className="modal-actions">
              <button
                className="danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                {t('users.confirm')}
              </button>
              <button className="cancel" onClick={() => setDeleteId(null)}>
                {t('attendance.popover.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="detail-topbar">
        <button className="back-btn" onClick={() => navigate('/attendance')}>
          <i className="fa-solid fa-arrow-left"></i> {t('attendance.back')}
        </button>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="detail-card">
        <h1 className="detail-name">{employee?.employee || `#${employeeId}`}</h1>
        <div className="detail-meta">
          <span>
            {t('attendance.table.position')}: <b>{employee?.position || '-'}</b>
          </span>
          <span>
            {t('attendance.table.branch')}:{' '}
            <b>{employee?.branch ? getLocalized(employee.branch, 'name', i18n.language) : '-'}</b>
          </span>
        </div>

        <div className="detail-stats">
          <div className="detail-stat">
            <span>{t('attendance.detail.workedDays')}</span>
            <b>{summary.days}</b>
          </div>
          <div className="detail-stat">
            <span>{t('attendance.detail.totalHours')}</span>
            <b>{summary.hours}</b>
          </div>
          <div className="detail-stat">
            <span>{t('attendance.legend.late')}</span>
            <b>{summary.late}</b>
          </div>
          <div className="detail-stat">
            <span>{t('attendance.legend.absentNoExcuse')}</span>
            <b>{summary.absent}</b>
          </div>
        </div>
      </div>

      <h2 className="detail-section-title">{t('attendance.detail.byDay')}</h2>
      <div className="attendance-table-wrapper">
        <table className="attendance-list-table">
          <thead>
            <tr>
              <th className="col-date">{t('attendance.table.date')}</th>
              <th className="col-times">{t('attendance.type.in')}</th>
              <th className="col-times">{t('attendance.type.out')}</th>
              <th>{t('attendance.detail.duration')}</th>
              <th>{t('attendance.table.status')}</th>
              <th className="col-comment">{t('attendance.detail.comment')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={5} columnCount={6} />
            ) : days.length > 0 ? (
              days.map((d) => (
                <tr key={d.date}>
                  <td className="col-date">{formatDate(d.date)}</td>
                  <td className="col-times">
                    <div className="time-list">
                      {d.pairs.length > 0
                        ? d.pairs.map((p, i) => (
                            <span
                              key={i}
                              className={`time-chip ${p.in ? 'time-in' : 'time-empty'}`}
                            >
                              {p.in || '—'}
                            </span>
                          ))
                        : '-'}
                    </div>
                  </td>
                  <td className="col-times">
                    <div className="time-list">
                      {d.pairs.length > 0
                        ? d.pairs.map((p, i) => (
                            <span
                              key={i}
                              className={`time-chip ${p.out ? 'time-out' : 'time-empty'}`}
                            >
                              {p.out || '—'}
                            </span>
                          ))
                        : '-'}
                    </div>
                  </td>
                  <td>{durationBetween(d.ins[0], d.outs[d.outs.length - 1])}</td>
                  <td>
                    {d.statuses.length > 0
                      ? d.statuses.map((s) => t(statusLabelKey(s))).join(', ')
                      : '-'}
                  </td>
                  <td className="col-comment">{d.comments.join(' | ') || '-'}</td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={6} message={t('attendance.notFound')} />
            )}
          </tbody>
        </table>
      </div>

      <h2 className="detail-section-title">{t('attendance.detail.allRecords')}</h2>
      <div className="attendance-table-wrapper">
        <table className="attendance-list-table">
          <thead>
            <tr>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th className="col-date">{t('attendance.table.date')}</th>
              <th className="col-comment">{t('attendance.detail.comment')}</th>
              <th>{t('attendance.table.type')}</th>
              <th>{t('attendance.table.time')}</th>
              <th>{t('attendance.table.status')}</th>
              <th>{t('attendance.table.actions')}</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={5} columnCount={7} />
            ) : records.length > 0 ? (
              records.map((r) => {
                const codes = (Array.isArray(r.status) ? r.status : [])
                  .map(toStatusCode)
                  .filter((s): s is StatusCode => s !== null);

                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td className="col-date">{formatDate(r.date)}</td>
                    <td className="col-comment">{r.comment || '-'}</td>
                    <td>
                      <span className={`type-badge ${r.type === 'out' ? 'type-out' : 'type-in'}`}>
                        {r.type === 'out' ? t('attendance.type.out') : t('attendance.type.in')}
                      </span>
                    </td>
                    <td>{shortTime(r.time || r.check_in) || '-'}</td>
                    <td>
                      {codes.length > 0
                        ? codes.map((s) => t(statusLabelKey(s))).join(', ')
                        : '-'}
                    </td>
                    <td className="actions">
                      <div className="actions-row">
                        <Protected permission="attendance.edit">
                          <button className="user-edit-btn" onClick={() => openEdit(r)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                        </Protected>
                        <Protected permission="attendance.delete">
                          <button className="user-delete-btn" onClick={() => setDeleteId(r.id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </Protected>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <EmptyState colSpan={7} message={t('attendance.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AttendanceDetail;
