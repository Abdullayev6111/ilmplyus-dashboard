import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../pages/tasks/tasks.css';
import { API } from '../api/api';
import { useCreateMutation, useDeleteMutation, useUpdateMutation } from '../hooks/useMutations';
import {
  type Task,
  type TaskComment,
  type UpdateTaskStatusPayload as UpdateStatusPayload,
  type AddTaskCommentPayload as AddCommentPayload,
} from '@/types/tasks.types';
import { Protected } from './Protected';
import { getLocalized } from '@/utils/getLocalized';

type Role = 'manager' | 'operator';

interface TaskCardProps {
  task: Task;
  role: Role;
  onEdit: (task: Task) => void;
}

const priorityClassMap: Record<Task['priority'], string> = {
  shoshilinch: 'task-card__priority--shoshilinch',
  orta: 'task-card__priority--orta',
  sekin: 'task-card__priority--bemalol',
};

const priorityLabelMap: Record<Task['priority'], string> = {
  shoshilinch: 'taskCard.priority.urgent',
  orta: 'taskCard.priority.medium',
  sekin: 'taskCard.priority.low',
};

function formatDeadline(dateStr: string): string {
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hh}:${mm} ${day}.${month}.${year}`;
}

function getShortName(fullName: string): string {
  const parts = fullName.trim().split(' ');
  return `${parts[0] ?? ''} ${parts[1] ?? ''}`.trim();
}

export default function TaskCard({ task, role, onEdit }: TaskCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const comments = task.comments ?? [];
  const [pendingStatus, setPendingStatus] = useState<'bajarildi' | 'bajarilmadi' | null>(null);

  const statusMutation = useUpdateMutation<void, Error, UpdateStatusPayload>(
    ({ taskId, status }) => API.patch(`/tasks/${taskId}/status`, { status }),
    [['tasks']],
  );

  const taskDeleteMutation = useDeleteMutation(
    (taskId) => API.delete(`/tasks/${taskId}`),
    [['tasks']],
  );

  const commentMutation = useCreateMutation<TaskComment, Error, AddCommentPayload>(
    (payload) => API.post('/tasks/comment', payload).then((r) => r.data),
    [['tasks']],
  );

  const handleStatus = (status: UpdateStatusPayload['status']) => {
    statusMutation.mutate({ taskId: task.id, status });
  };

  const handleDelete = () => {
    taskDeleteMutation.mutate(task.id);
  };

  const handleCommentAndFinish = (comment: string) => {
    if (!pendingStatus) return;
    const targetStatus = pendingStatus;
    commentMutation.mutate(
      { task_id: task.id, comment_uz: comment, user_id: task.operator_id },
      {
        onSuccess: () => {
          statusMutation.mutate({ taskId: task.id, status: targetStatus });
          setPendingStatus(null);
        },
      },
    );
  };

  const isMutating = statusMutation.isPending || commentMutation.isPending;

  return (
    <div className="task-card">
      <div className="task-card__header">
        <span className={`task-card__priority ${priorityClassMap[task?.priority]}`}>
          {t(priorityLabelMap[task?.priority])}
        </span>
        <div className="task-card__header-right">
          <span className="task-card__lid">
            {t('taskCard.lidId')}:{task?.lid_id}
          </span>
          <span className="task-card__deadline">{formatDeadline(task?.deadline)}</span>
        </div>
      </div>

      <div className="task-card__meta">
        <p className="task-card__name">
          {task?.lid?.first_name} {task?.lid?.last_name}
        </p>
        <span className="task-card__operator">
          <span className="task-card__operator-icon">👤</span>
          {getShortName(task?.operator?.full_name)}
        </span>
      </div>

      {task.description_uz ? (
        <div className="task-card__comment-box">
          <span className="task-card__comment-label">{t('taskCard.managerComment')}:</span>{' '}
          {getLocalized(task, 'description', lang)}
          <span className="task-card__comment-time">{formatDeadline(task?.created_at)}</span>
        </div>
      ) : null}

      {comments.map((c) => (
        <div key={c.id} className="task-card__comment-box">
          <span className="task-card__comment-label">{t('taskCard.operatorComment')}:</span>{' '}
          {getLocalized(c, 'comment', lang)}
          <span className="task-card__comment-time">{formatDeadline(c?.created_at)}</span>
        </div>
      ))}

      <OperatorSection
        taskId={task.id}
        status={task.status}
        pendingStatus={pendingStatus}
        onStart={() => handleStatus('bajarish')}
        onRequestFinish={(s) => setPendingStatus(s)}
        onCancelFinish={() => setPendingStatus(null)}
        onCommentAndFinish={handleCommentAndFinish}
        loading={isMutating}
      />

      {role === 'manager' && (
        <div className="task-card__actions">
          <Protected permission="tasks.edit">
            <button
              type="button"
              className="task-card__btn task-card__btn--tahrirlash"
              onClick={() => onEdit(task)}
            >
              ✏ {t('taskCard.editBtn')}
            </button>
          </Protected>
          <Protected permission="tasks.delete">
            <button
              type="button"
              className="task-card__btn task-card__btn--ochirish"
              onClick={handleDelete}
              disabled={taskDeleteMutation.isPending}
            >
              ✕ {t('taskCard.deleteBtn')}
            </button>
          </Protected>
        </div>
      )}
    </div>
  );
}

const STARTED_KEY = 'startedTasks';

function getStartedIds(): number[] {
  try { return JSON.parse(localStorage.getItem(STARTED_KEY) || '[]'); } catch { return []; }
}
function markStarted(taskId: number) {
  const ids = getStartedIds();
  if (!ids.includes(taskId)) localStorage.setItem(STARTED_KEY, JSON.stringify([...ids, taskId]));
}

interface OperatorSectionProps {
  taskId: number;
  status: Task['status'];
  pendingStatus: 'bajarildi' | 'bajarilmadi' | null;
  onStart: () => void;
  onRequestFinish: (s: 'bajarildi' | 'bajarilmadi') => void;
  onCancelFinish: () => void;
  onCommentAndFinish: (comment: string) => void;
  loading: boolean;
}

function OperatorSection({
  taskId,
  status,
  pendingStatus,
  onStart,
  onRequestFinish,
  onCancelFinish,
  onCommentAndFinish,
  loading,
}: OperatorSectionProps) {
  const { t } = useTranslation();
  const [isStarted, setIsStarted] = useState(() => getStartedIds().includes(taskId));

  if (status === 'bajarildi') {
    return (
      <div className="task-card__actions">
        <button className="task-card__btn task-card__btn--yakunlangan-long" disabled>
          {t('tasks.filter.bajarildi')}
        </button>
      </div>
    );
  }

  if (status === 'bajarilmadi') {
    return (
      <div className="task-card__actions">
        <button className="task-card__btn task-card__btn--bajarilmadi-long" disabled>
          ✕ {t('tasks.filter.bajarilmadi')}
        </button>
      </div>
    );
  }

  if (pendingStatus !== null) {
    return (
      <CommentBeforeFinish
        pendingStatus={pendingStatus}
        onSubmit={onCommentAndFinish}
        onCancel={onCancelFinish}
        loading={loading}
      />
    );
  }

  if (isStarted) {
    return (
      <div className="task-card__actions-wrap">
        <div className="task-card__status-in-progress">{t('taskCard.status.inProgress')}</div>
        <div className="task-card__actions">
          <button
            type="button"
            className="task-card__btn task-card__btn--bajarildi"
            onClick={() => onRequestFinish('bajarildi')}
            disabled={loading}
          >
            ✓ {t('taskCard.btn.done')}
          </button>
          <button
            type="button"
            className="task-card__btn task-card__btn--bajarilmadi"
            onClick={() => onRequestFinish('bajarilmadi')}
            disabled={loading}
          >
            ✕ {t('taskCard.btn.notDone')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-card__actions">
      <button
        type="button"
        className="task-card__btn task-card__btn--bajarish"
        onClick={() => { markStarted(taskId); setIsStarted(true); onStart(); }}
        disabled={loading}
      >
        ▶ {t('taskCard.btn.start')}
      </button>
    </div>
  );
}

interface CommentBeforeFinishProps {
  pendingStatus: 'bajarildi' | 'bajarilmadi';
  onSubmit: (comment: string) => void;
  onCancel: () => void;
  loading: boolean;
}

function CommentBeforeFinish({
  pendingStatus,
  onSubmit,
  onCancel,
  loading,
}: CommentBeforeFinishProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const value = inputRef.current?.value.trim();
    if (value) onSubmit(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const btnClass =
    pendingStatus === 'bajarildi'
      ? 'task-card__btn task-card__btn--bajarildi'
      : 'task-card__btn task-card__btn--bajarilmadi';

  const btnLabel =
    pendingStatus === 'bajarildi'
      ? `✓ ${t('taskCard.btn.done')}`
      : `✕ ${t('taskCard.btn.notDone')}`;

  return (
    <div className="task-card__comment-wrap">
      <input
        ref={inputRef}
        className="task-card__comment-input"
        placeholder={t('taskCard.writeCommentPlaceholder')}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="task-card__actions">
        <button
          type="button"
          className="task-card__btn task-card__btn--bekor"
          onClick={onCancel}
          disabled={loading}
        >
          Bekor
        </button>
        <button type="button" className={btnClass} onClick={handleSubmit} disabled={loading}>
          {loading ? '...' : btnLabel}
        </button>
      </div>
    </div>
  );
}
