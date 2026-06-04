import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import TaskCard from '@/components/TaskCard';
import TaskModal from '@/components/TaskModal';
import './tasks.css';
import { API } from '@/api/api';
import { Protected } from '@/components/Protected';
import useAuthStore from '@/store/useAuthStore';
import type { Task, TaskStatus } from '@/types/tasks.types';
import type { User } from '@/types/users.types';

function isOperatorUser(user: User): boolean {
  return user.roles.some((r) => r.name.toLowerCase().includes('operator'));
}

type FilterStatus = 'barchasi' | TaskStatus;
type Role = 'manager' | 'operator';

const FILTER_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: 'Barchasi', value: 'barchasi' },
  { label: 'Bajarilmoqda', value: 'bajarish' },
  { label: 'Yakunlangan', value: 'bajarildi' },
  { label: 'Bajarilmadi', value: 'bajarilmadi' },
];

export default function Tasks() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('barchasi');
  const [operatorFilter, setOperatorFilter] = useState<number | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | undefined>(undefined);

  const isOperator = user ? isOperatorUser(user) : false;
  const role: Role = isOperator ? 'operator' : 'manager';

  const { data: usersArray = [] } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await API.get('/users');
      const d = res.data;
      return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : (d?.data?.data ?? []);
    },
  });

  const { data: employees = [] } = useQuery<User[], Error>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await API.get('/employees');
      const d = res.data;
      return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : (d?.data?.data ?? []);
    },
  });

  const currentUserEmployeeId = useMemo(() => {
    if (!user?.pinfl || employees.length === 0) return 0;
    return employees.find((e) => e.pinfl === user.pinfl)?.id || 0;
  }, [user, employees]);

  const effectiveOperatorFilter = role === 'operator' ? currentUserEmployeeId : operatorFilter;

  const {
    data: tasksRaw,
    isLoading,
    isError,
  } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: () =>
      API.get('/tasks').then((r) => {
        const responseData = r.data;
        if (Array.isArray(responseData)) return responseData;
        if (Array.isArray(responseData?.data)) return responseData.data;
        return [];
      }),
  });

  const operators = useMemo(() => {
    return usersArray
      .filter(isOperatorUser)
      .map((u) => {
        const emp = employees.find((e) => e.pinfl === u.pinfl);
        return emp ? { ...u, employee_id: emp.id } : null;
      })
      .filter((u): u is User & { employee_id: number } => u !== null);
  }, [usersArray, employees]);

  const filteredTasks: Task[] = (tasksRaw ?? []).filter((task) => {
    const statusMatch = activeFilter === 'barchasi' || task.status === activeFilter;
    const operatorMatch =
      effectiveOperatorFilter === '' || task.operator_id === Number(effectiveOperatorFilter);
    return statusMatch && operatorMatch;
  });

  function getShortName(fullName: string) {
    const parts = fullName.split(' ');
    return `${parts[0] ?? ''} ${parts[1] ?? ''}`;
  }

  const handleOpenCreate = () => {
    setEditTask(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditTask(task);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditTask(undefined);
  };

  return (
    <div className="tasks container">
      {role === 'manager' && (
        <div className="tasks-top">
          <div className="tasks-top-left">
            <div className="tasks-filters">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`tasks-filter-btn${activeFilter === opt.value ? ' active' : ''}`}
                  onClick={() => setActiveFilter(opt.value)}
                >
                  {t(`tasks.filter.${opt.value}`)}
                </button>
              ))}
            </div>

            <select
              className="tasks-operator-select"
              value={operatorFilter}
              onChange={(e) =>
                setOperatorFilter(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">{t('tasks.allOperators')}</option>

              {operators.map((u) => (
                <option key={u.id} value={u.employee_id}>
                  {getShortName(u.full_name)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Protected permission="tasks.create">
              <button className="tasks-create-btn" onClick={handleOpenCreate}>
                ＋ {t('tasks.createTask')}
              </button>
            </Protected>
          </div>
        </div>
      )}

      {role === 'operator' && (
        <div className="tasks-top tasks-top--operator">
          <h2 className="tasks-title">{t('tasks.taskList')}</h2>

          <div className="tasks-top-right">
            <div className="tasks-filters">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`tasks-filter-btn${activeFilter === opt.value ? ' active' : ''}`}
                  onClick={() => setActiveFilter(opt.value)}
                >
                  {t(`tasks.filter.${opt.value}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && <div className="tasks-state loading">{t('tasks.loading')}</div>}

      {isError && <div className="tasks-state error">{t('tasks.error')}</div>}

      {!isLoading && !isError && filteredTasks.length === 0 && (
        <div className="tasks-state">{t('tasks.noTasks')}</div>
      )}

      {!isLoading && !isError && filteredTasks.length > 0 && (
        <div className="tasks-content">
          {filteredTasks?.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              role={role}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {modalOpen && <TaskModal onClose={handleCloseModal} editTask={editTask} />}
    </div>
  );
}
