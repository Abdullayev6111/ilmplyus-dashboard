import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../api/api';
import { useTranslation } from 'react-i18next';

interface WorkSchedule {
  id: number;
  user_id: number;
  week_day: number;
  start_time: string;
  end_time: string;
  type: string;
  note: string;
}

interface Props {
  userId: number;
  onClose: () => void;
  /** Payload va so'rovda qaysi kalit yuborilsin. Users sahifasi `user_id`,
   *  xodimlar shartnomasi sahifasi `employee_id` bilan ishlaydi. */
  idKey?: 'user_id' | 'employee_id';
}

const DAYS: { num: number; key: string }[] = [
  { num: 1, key: 'monday' },
  { num: 2, key: 'tuesday' },
  { num: 3, key: 'wednesday' },
  { num: 4, key: 'thursday' },
  { num: 5, key: 'friday' },
  { num: 6, key: 'saturday' },
  { num: 7, key: 'sunday' },
];

const SCHEDULE_TYPES = ['normal', 'overtime', 'flexible'];

interface FormProps extends Props {
  existing: WorkSchedule[];
}

const WorkScheduleForm = ({ userId, onClose, existing, idKey = 'user_id' }: FormProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const first = existing[0];
  const [selectedDays, setSelectedDays] = useState<number[]>(() =>
    existing.map((s) => s.week_day),
  );
  const [startTime, setStartTime] = useState(() =>
    first ? first.start_time.slice(0, 5) : '09:00',
  );
  const [endTime, setEndTime] = useState(() =>
    first ? first.end_time.slice(0, 5) : '18:00',
  );
  const [type, setType] = useState(() => first?.type || 'normal');
  const [note, setNote] = useState(() => first?.note || '');

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedDays.length === 0) return;

      if (selectedDays.length === 1) {
        await API.post('/work_schedules', {
          [idKey]: userId,
          week_day: selectedDays[0],
          start_time: startTime,
          end_time: endTime,
          type,
          note,
        });
      } else {
        await API.put('/work_schedules/bulk', {
          [idKey]: userId,
          days: selectedDays,
          start_time: startTime,
          end_time: endTime,
          type,
          note,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_schedules', idKey, userId] });
      onClose();
    },
  });

  const toggleDay = (num: number) => {
    setSelectedDays((prev) =>
      prev.includes(num) ? prev.filter((d) => d !== num) : [...prev, num],
    );
  };

  const selectAll = () => setSelectedDays(DAYS.map((d) => d.num));
  const clearAll = () => setSelectedDays([]);

  return (
    <>
      {/* Day toggles */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            {t('workSchedule.chooseDays')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={selectAll}
              style={{
                fontSize: 12,
                padding: '2px 10px',
                borderRadius: 4,
                border: '1px solid #003366',
                background: 'transparent',
                cursor: 'pointer',
                color: '#003366',
              }}
            >
              {t('workSchedule.all')}
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={{
                fontSize: 12,
                padding: '2px 10px',
                borderRadius: 4,
                border: '1px solid #aaa',
                background: 'transparent',
                cursor: 'pointer',
                color: '#666',
              }}
            >
              {t('workSchedule.clear')}
            </button>
          </div>
        </div>

        <div className="work-schedule-days">
          {DAYS.map(({ num, key }) => {
            const active = selectedDays.includes(num);
            return (
              <button
                key={num}
                type="button"
                onClick={() => toggleDay(num)}
                className={`ws-day-chip ${active ? 'ws-day-chip-active' : ''}`}
              >
                {t(`workSchedule.days.${key}`).slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            {t('workSchedule.startTime')}
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid #ccd6e0',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>
        <span style={{ marginTop: 22, color: '#777', fontSize: 18 }}>—</span>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
            {t('workSchedule.endTime')}
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid #ccd6e0',
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* Type */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          {t('workSchedule.type')}
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccd6e0',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          {SCHEDULE_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {t(`workSchedule.types.${tp}`, { defaultValue: tp })}
            </option>
          ))}
        </select>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          {t('workSchedule.note')}
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('workSchedule.notePlaceholder')}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccd6e0',
            borderRadius: 6,
            fontSize: 14,
          }}
        />
      </div>

      {/* Endpoint info */}
      {selectedDays.length > 0 && (
        <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
          {selectedDays.length === 1
            ? `POST /work_schedules  •  week_day: ${selectedDays[0]}`
            : `PUT /work-schedules/bulk  •  days: [${selectedDays.join(', ')}]`}
        </p>
      )}

      <div className="modal-actions">
        <button
          className="primary"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || selectedDays.length === 0}
        >
          {saveMutation.isPending ? t('workSchedule.saving') : t('workSchedule.save')}
        </button>
        <button className="cancel" onClick={onClose}>
          {t('workSchedule.cancel')}
        </button>
      </div>
    </>
  );
};

const WorkScheduleModal = ({ userId, onClose, idKey = 'user_id' }: Props) => {
  const { t } = useTranslation();

  const { data: existing, isLoading } = useQuery<WorkSchedule[]>({
    queryKey: ['work_schedules', idKey, userId],
    queryFn: async () => {
      const { data } = await API.get('/work_schedules', { params: { [idKey]: userId } });
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  return (
    <div className="modal-overlay">
      <div className="modal work-schedule-modal">
        <h3 className="modal-title">{t('workSchedule.title')}</h3>

        {isLoading || existing === undefined ? (
          <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            {t('workSchedule.loading')}
          </p>
        ) : (
          <WorkScheduleForm
            key={userId}
            userId={userId}
            idKey={idKey}
            onClose={onClose}
            existing={existing}
          />
        )}
      </div>
    </div>
  );
};

export default WorkScheduleModal;
