import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API } from '@/api/api';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useCreateMutation, useUpdateMutation } from '@/hooks/useMutations';
import type {
  Task,
  TaskPriority as Priority,
  CreateTaskPayload,
  UpdateTaskPayload,
} from '@/types/tasks.types';
import type { User as OperatorUser } from '@/types/users.types';
import type { Lid as LidResult } from '@/types/lid.types';
import useAuthStore from '@/store/useAuthStore';

interface TaskModalProps {
  onClose: () => void;
  editTask?: Task;
  initialLidId?: number;
  initialLidName?: string;
}

const PRIORITY_OPTIONS: { label: string; value: Priority }[] = [
  { label: 'Shoshilinch', value: 'shoshilinch' },
  { label: 'O‘rta', value: 'orta' },
  { label: 'Sekin', value: 'sekin' },
];

function deadlineToInputs(deadline: string): { date: string; time: string } {
  const d = new Date(deadline);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
}

function buildDeadline(date: string, time: string): string {
  // ISO string generates zero-offset (UTC) time which causes issues when backend treats it blindly.
  // We send the specific time format as-is to preserve local GMT+5 hour value.
  return `${date} ${time}:00`;
}

function isValidTime(time: string): boolean {
  if (!time.includes(':')) return false;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  if (h > 23 || m > 59) return false;
  return true;
}

function getShortName(full_name: string): string {
  const parts = full_name.trim().split(' ');
  return `${parts[0] ?? ''} ${parts[1] ?? ''}`.trim();
}

function isOperator(user: OperatorUser): boolean {
  return user.roles.some((r) => r.name.toLowerCase().includes('operator'));
}

export default function TaskModal({
  onClose,
  editTask,
  initialLidId,
  initialLidName,
}: TaskModalProps) {
  const { t } = useTranslation();
  const isEdit = !!editTask;

  const firstComment = editTask?.comments?.[0];
  const [comment, setComment] = useState(isEdit ? (firstComment?.comment_uz ?? '') : '');

  const [lidSearch, setLidSearch] = useState(
    isEdit
      ? `${editTask.lid?.first_name ?? ''} ${editTask.lid?.last_name ?? ''}`.trim()
      : (initialLidName ?? ''),
  );

  const [selectedLidId, setSelectedLidId] = useState<number | null>(
    isEdit ? editTask.lid_id : (initialLidId ?? null),
  );

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [priority, setPriority] = useState<Priority>(isEdit ? editTask.priority : 'orta');

  const defaultInputs = isEdit ? deadlineToInputs(editTask.deadline) : { date: '', time: '' };

  const [date, setDate] = useState(defaultInputs.date);
  const [time, setTime] = useState(defaultInputs.time);
  const [timeError, setTimeError] = useState(false);

  const [overrideOperatorId, setOverrideOperatorId] = useState<number | '' | null>(null);

  const user = useAuthStore((state) => state.user);

  const { data: operators = [] } = useQuery<OperatorUser[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await API.get('/users');
      const d = res.data;
      const arr: OperatorUser[] = Array.isArray(d)
        ? d
        : Array.isArray(d?.data)
          ? d.data
          : (d?.data?.data ?? []);
      return arr.filter(isOperator);
    },
  });

  const { data: employees = [] } = useQuery<OperatorUser[], Error>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await API.get('/employees');
      const d = res.data;
      return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : (d?.data?.data ?? []);
    },
  });

  const derivedOperatorId = useMemo<number | ''>(() => {
    if (isEdit && editTask && employees.length > 0 && operators.length > 0) {
      const taskEmp = employees.find((e) => e.id === editTask.operator_id);
      if (taskEmp) {
        const taskUser = operators.find((o) => o.pinfl === taskEmp.pinfl);
        if (taskUser) return taskUser.id;
      }
    } else if (!isEdit && operators.length > 0) {
      const authOperator = operators.find((o) => o.pinfl === user?.pinfl);
      if (authOperator) return authOperator.id;
    }
    return '';
  }, [isEdit, editTask, employees, operators, user?.pinfl]);

  const operatorId = overrideOperatorId ?? derivedOperatorId;

  const { data: allLids = [], isLoading: isLidsLoading } = useQuery<LidResult[], Error>({
    queryKey: ['lids'],
    queryFn: async () => {
      const res = await API.get('/lids');
      const d = res.data;
      return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : (d?.data?.data ?? []);
    },
    enabled: !isEdit,
  });

  const lidResults = useMemo(() => {
    if (!lidSearch.trim()) return allLids;
    const q = lidSearch.toLowerCase();
    return allLids.filter(
      (lid) =>
        lid.first_name?.toLowerCase().includes(q) ||
        lid.last_name?.toLowerCase().includes(q) ||
        String(lid.id).includes(q),
    );
  }, [allLids, lidSearch]);

  const createMutation = useCreateMutation<Task, Error, CreateTaskPayload>(
    async (payload) => {
      const res = await API.post('/tasks', payload);
      return res.data?.data ?? res.data;
    },
    [['tasks']],
  );

  const updateMutation = useUpdateMutation<Task, Error, UpdateTaskPayload>(
    async (payload) => {
      const res = await API.put(`/tasks/${editTask!.id}`, payload);
      return res.data?.data ?? res.data;
    },
    [['tasks']],
  );

  const handleTimeInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;

    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }

    setTime(formatted);

    if (formatted.length === 5) {
      setTimeError(!isValidTime(formatted));
    } else {
      setTimeError(false);
    }
  };

  const handleSelectLid = (lid: LidResult) => {
    setSelectedLidId(lid.id);
    setLidSearch(`${lid.first_name} ${lid.last_name}`);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (!date || !time || timeError) {
      notifications.show({
        title: 'Xatolik',
        message: t('Sana yoki vaqtni t‘g‘ri kiriting'),
        color: 'red',
      });
      return;
    }
    if (!comment.trim()) {
      notifications.show({
        title: 'Xatolik',
        message: t('Izoh kiritish majburiy'),
        color: 'red',
      });
      return;
    }
    if (operatorId === '') {
      notifications.show({
        title: 'Xatolik',
        message: t('Iltimos, operatorni tanlang'),
        color: 'red',
      });
      return;
    }

    let finalOperatorId: number;

    if (isEdit && overrideOperatorId === null) {
      finalOperatorId = editTask!.operator_id;
    } else {
      const selectedUser = operators.find((u) => u.id === operatorId);
      const matchedEmployee = employees.find(
        (e) => e.pinfl && selectedUser?.pinfl && e.pinfl === selectedUser.pinfl,
      );
      finalOperatorId = matchedEmployee?.id ?? 0;

      if (!finalOperatorId) {
        notifications.show({
          title: 'Xatolik',
          message:
            'Ushbu operatorga mos keluvchi Xodim (Employee) bazadan topilmadi (PINFL mos kelmadi).',
          color: 'red',
        });
        return;
      }
    }

    const deadline = buildDeadline(date, time);

    if (isEdit) {
      updateMutation.mutate(
        {
          priority,
          deadline,
          operator_id: finalOperatorId,
          description_uz: comment,
        },
        { onSuccess: onClose },
      );
      return;
    }

    if (!selectedLidId) {
      notifications.show({
        title: 'Xatolik',
        message: t('Iltimos, Lidni tanlang'),
        color: 'red',
      });
      return;
    }

    createMutation.mutate(
      {
        lid_id: selectedLidId,
        operator_id: finalOperatorId,
        deadline,
        priority,
        description_uz: comment,
      },
      { onSuccess: onClose },
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__title">
          {isEdit ? t('taskModal.editTitle') : t('taskModal.createTitle')}
        </div>

        {!isEdit && (
          <div className="modal__field">
            <label className="modal__label">{t('taskModal.selectLid')}</label>

            <div className="modal__search-wrap">
              <input
                className="modal__input"
                placeholder={t('taskModal.lidPlaceholder')}
                value={lidSearch}
                onChange={(e) => {
                  setLidSearch(e.target.value);
                  setSelectedLidId(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />

              <span className="modal__search-icon">🔍</span>

              {showSuggestions && (
                <div className="modal__suggestions">
                  {isLidsLoading ? (
                    <div
                      className="modal__suggestion-item"
                      style={{ color: '#888', cursor: 'default' }}
                    >
                      Yuklanmoqda...
                    </div>
                  ) : lidResults.length > 0 ? (
                    lidResults.map((lid) => (
                      <div
                        key={lid.id}
                        className="modal__suggestion-item"
                        onMouseDown={() => handleSelectLid(lid)}
                      >
                        {lid.first_name} {lid.last_name} — ID: {lid.id}
                      </div>
                    ))
                  ) : (
                    <div
                      className="modal__suggestion-item"
                      style={{ color: '#888', cursor: 'default' }}
                    >
                      Ma'lumot mavjud emas
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="modal__field">
          <label className="modal__label">{t('taskModal.priority')}</label>

          <div className="modal__priority-group">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`modal__priority-btn${priority === opt.value ? ' active' : ''}`}
                onClick={() => setPriority(opt.value)}
                type="button"
              >
                {t(`taskModal.priorityOptions.${opt.value}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="modal__row">
          <div className="modal__field">
            <label className="modal__label">{t('taskModal.date')}</label>

            <input
              type="date"
              className="modal__input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">{t('taskModal.time')}</label>

            <input
              className={`modal__input${timeError ? ' modal__input--error' : ''}`}
              placeholder="10:00"
              value={time}
              onChange={(e) => handleTimeInput(e.target.value)}
              maxLength={5}
            />
          </div>
        </div>

        <div className="modal__field">
          <label className="modal__label">{t('taskModal.operator')}</label>

          <select
            className="modal__select"
            value={operatorId}
            onChange={(e) =>
              setOverrideOperatorId(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <option value="">{t('taskModal.selectOperator')}</option>

            {operators.map((u) => (
              <option key={u.id} value={u.id}>
                {getShortName(u.full_name)}
              </option>
            ))}
          </select>
        </div>

        <div className="modal__field">
          <label className="modal__label">{t('taskModal.comment')}</label>

          <textarea
            className="modal__textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <button className="modal__save-btn" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? t('taskModal.saving') : t('taskModal.saveBtn')}
          </button>

          <button className="modal__close" onClick={onClose}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}
