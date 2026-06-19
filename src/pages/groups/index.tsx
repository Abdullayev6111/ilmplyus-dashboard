import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '../../api/api';
import '../users/users.css';
import './groups.css';
import { getLocalized } from '../../utils/getLocalized';
import { useTranslation } from 'react-i18next';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';
import type { Group, GroupPayload, GroupsApiResponse, Room, ScheduleTeacher } from '../../types/groups.types';
import type { Branch } from '../../types/common.types';
import type { Course } from '../../types/course.types';
import { Protected } from '../../components/Protected';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const DAY_NUM: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function computeDuration(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  days: string[],
): number {
  if (!startDate || !endDate || !startTime || !endTime || !days.length) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const lessonMinutes = eh * 60 + em - (sh * 60 + sm);
  if (lessonMinutes <= 0) return 0;
  const selectedNums = days.map((d) => DAY_NUM[d]).filter(Boolean);
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (selectedNums.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.round((count * lessonMinutes) / 60);
}

// ─── Custom select with availability badge ────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
  busy: boolean;
}

interface GroupSelectProps {
  value: string;
  options: SelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}

function GroupSelect({ value, options, placeholder, onChange }: GroupSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="group-select">
      <button
        type="button"
        className="group-select__trigger"
        onClick={() => setOpen((p) => !p)}
      >
        <span>{selected?.label ?? placeholder}</span>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '12px' }} />
      </button>

      {open && (
        <div className="group-select__dropdown">
          <div
            className="group-select__option group-select__option--placeholder"
            onClick={() => { onChange(''); setOpen(false); }}
          >
            {placeholder}
          </div>
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`group-select__option${value === opt.value ? ' group-select__option--active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{opt.label}</span>
              <span className={`avail-badge ${opt.busy ? 'avail-badge--busy' : 'avail-badge--free'}`}>
                {opt.busy ? t('groups.busy') : t('groups.free')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface GroupFormData {
  name: string;
  branch_id: string;
  course_id: string;
  level_id: string;
  teacher_id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  days: string[];
}

const emptyForm = (): GroupFormData => ({
  name: '',
  branch_id: '',
  course_id: '',
  level_id: '',
  teacher_id: '',
  room_id: '',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  days: [],
});

// ─── Main component ───────────────────────────────────────────────────────────

const Groups = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [viewGroup, setViewGroup] = useState<Group | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [formData, setFormData] = useState<GroupFormData>(emptyForm());

  // Day label maps (translated)
  const DAY_LABELS = useMemo<Record<string, string>>(() => ({
    monday: t('groups.daysNames.monday'),
    tuesday: t('groups.daysNames.tuesday'),
    wednesday: t('groups.daysNames.wednesday'),
    thursday: t('groups.daysNames.thursday'),
    friday: t('groups.daysNames.friday'),
    saturday: t('groups.daysNames.saturday'),
  }), [t]);

  const DAY_SHORT = useMemo<Record<string, string>>(() => ({
    monday: t('groups.daysShort.monday'),
    tuesday: t('groups.daysShort.tuesday'),
    wednesday: t('groups.daysShort.wednesday'),
    thursday: t('groups.daysShort.thursday'),
    friday: t('groups.daysShort.friday'),
    saturday: t('groups.daysShort.saturday'),
  }), [t]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: groupsData, isLoading } = useQuery<GroupsApiResponse>({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await API.get<GroupsApiResponse>('/groups');
      return data;
    },
  });

  const { data: branchesData } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await API.get<Branch[] | { data: Branch[] }>('/branches');
      return Array.isArray(data) ? data : data.data;
    },
  });

  const { data: coursesData } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await API.get<Course[] | { data: Course[] }>('/courses');
      return Array.isArray(data) ? data : data.data;
    },
  });

  const { data: roomsData } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const { data } = await API.get<{ data: Room[] }>('/rooms');
      return data.data;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (payload: GroupPayload) => {
      const { data } = await API.post<Group>('/groups', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: GroupPayload }) => {
      const { data } = await API.put<Group>(`/groups/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await API.delete(`/groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const allGroups: Group[] = useMemo(() => groupsData?.data ?? [], [groupsData]);

  const groups: Group[] = useMemo(() => {
    return allGroups
      .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (sortAsc ? a.id - b.id : b.id - a.id));
  }, [allGroups, search, sortAsc]);

  const teachers = useMemo<ScheduleTeacher[]>(() => {
    const seen = new Set<number>();
    const result: ScheduleTeacher[] = [];
    for (const g of allGroups) {
      if (g.teacher && !seen.has(g.teacher.id)) {
        seen.add(g.teacher.id);
        result.push(g.teacher);
      }
    }
    return result;
  }, [allGroups]);

  const branches: Branch[] = branchesData ?? [];
  const courses: Course[] = coursesData ?? [];
  const rooms: Room[] = roomsData ?? [];

  const filteredCourses = useMemo(
    () => courses.filter((c) => c.branches?.some((b) => b.id === Number(formData.branch_id))),
    [courses, formData.branch_id],
  );

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === Number(formData.course_id)) ?? null,
    [courses, formData.course_id],
  );

  const filteredLevels = useMemo(() => selectedCourse?.levels ?? [], [selectedCourse]);

  const selectedRoom = rooms.find((r) => r.id === Number(formData.room_id)) ?? null;

  const computedDuration = useMemo(
    () => computeDuration(formData.start_date, formData.end_date, formData.start_time, formData.end_time, formData.days),
    [formData.start_date, formData.end_date, formData.start_time, formData.end_time, formData.days],
  );

  // ── Availability helpers ───────────────────────────────────────────────────

  const isRoomBusy = useMemo(() => (roomId: number): boolean => {
    if (!formData.days.length) return false;
    return allGroups.some((g) => {
      if (editingGroup && g.id === editingGroup.id) return false;
      if (g.room?.id !== roomId) return false;
      return formData.days.some((day) => g.days?.includes(day));
    });
  }, [allGroups, formData.days, editingGroup]);

  const isTeacherBusy = useMemo(() => (teacherId: number): boolean => {
    if (!formData.days.length) return false;
    return allGroups.some((g) => {
      if (editingGroup && g.id === editingGroup.id) return false;
      if (g.teacher?.id !== teacherId) return false;
      return formData.days.some((day) => g.days?.includes(day));
    });
  }, [allGroups, formData.days, editingGroup]);

  const roomOptions: SelectOption[] = useMemo(
    () => rooms.map((r) => ({ value: r.id.toString(), label: r.name, busy: isRoomBusy(r.id) })),
    [rooms, isRoomBusy],
  );

  const teacherOptions: SelectOption[] = useMemo(
    () => teachers.map((t) => ({
      value: t.id.toString(),
      label: `${t.last_name} ${t.first_name}`,
      busy: isTeacherBusy(t.id),
    })),
    [teachers, isTeacherBusy],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? groups.map((g) => g.id) : []);

  const toggleOne = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormData(emptyForm());
    setShowModal(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      branch_id: group.branch?.id?.toString() ?? '',
      course_id: group.course?.id?.toString() ?? '',
      level_id: group.level?.id?.toString() ?? '',
      teacher_id: group.teacher?.id?.toString() ?? '',
      room_id: group.room?.id?.toString() ?? '',
      start_date: group.start_date ?? '',
      end_date: group.end_date ?? '',
      start_time: group.start_time?.slice(0, 5) ?? '',
      end_time: group.end_time?.slice(0, 5) ?? '',
      days: group.days ?? [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGroup(null);
    setFormData(emptyForm());
  };

  const handleSubmit = () => {
    const payload: GroupPayload = {
      name: formData.name,
      branch_id: Number(formData.branch_id),
      course_id: Number(formData.course_id),
      level_id: Number(formData.level_id),
      teacher_id: Number(formData.teacher_id),
      room_id: Number(formData.room_id),
      start_date: formData.start_date,
      end_date: formData.end_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      max_students: selectedRoom?.capacity ?? 0,
      days: formData.days,
      is_active: true,
      duration: computedDuration || undefined,
    };
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const confirmDelete = () => {
    if (deleteTarget !== null) deleteMutation.mutate(deleteTarget);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="users container">
      <h1 className="main-title">{t('groups.listTitle')}</h1>

      {/* ── Add / Edit modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal add-user-modal">
            <h3 className="modal-title">
              {editingGroup ? t('groups.editTitle') : t('groups.addTitle')}
            </h3>

            <div className="add-user-form">
              <div className="form-left">
                <div className="form-group">
                  <label>{t('groups.branch')}</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) =>
                      setFormData({ ...formData, branch_id: e.target.value, course_id: '', level_id: '', name: '' })
                    }
                  >
                    <option value="">{t('groups.choose')}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {getLocalized(b, 'name', i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('groups.course')}</label>
                  <select
                    value={formData.course_id}
                    disabled={!formData.branch_id}
                    onChange={(e) =>
                      setFormData({ ...formData, course_id: e.target.value, level_id: '', name: '' })
                    }
                  >
                    <option value="">
                      {formData.branch_id ? t('groups.choose') : t('groups.selectBranch')}
                    </option>
                    {filteredCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getLocalized(c, 'name', i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('groups.level')}</label>
                  <select
                    value={formData.level_id}
                    disabled={!formData.course_id}
                    onChange={(e) => {
                      const levelId = e.target.value;
                      const level = filteredLevels.find((l) => l.id === Number(levelId));
                      setFormData({ ...formData, level_id: levelId, name: level?.name_uz ?? '' });
                    }}
                  >
                    <option value="">
                      {formData.course_id ? t('groups.choose') : t('groups.selectCourse')}
                    </option>
                    {filteredLevels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {getLocalized(l, 'name', i18n.language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('groups.groupName')}</label>
                  <input
                    value={formData.name}
                    disabled={!formData.level_id}
                    placeholder={formData.level_id ? '' : t('groups.selectLevel')}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('groups.teacher')}</label>
                  <GroupSelect
                    value={formData.teacher_id}
                    options={teacherOptions}
                    placeholder={t('groups.choose')}
                    onChange={(v) => setFormData({ ...formData, teacher_id: v })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('groups.room')}</label>
                  <GroupSelect
                    value={formData.room_id}
                    options={roomOptions}
                    placeholder={t('groups.choose')}
                    onChange={(v) => setFormData({ ...formData, room_id: v })}
                  />
                  {selectedRoom && (
                    <span style={{ fontSize: '13px', color: '#003366', marginTop: '4px' }}>
                      {t('groups.capacity')}: <strong>{selectedRoom.capacity}</strong> {t('groups.pieces')}
                      &nbsp;·&nbsp;{selectedRoom.floor}-{t('groups.floor')}
                      &nbsp;·&nbsp;{selectedRoom.branch}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-right">
                <div className="form-group">
                  <label>{t('groups.startDateFull')}</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('groups.endDateFull')}</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('groups.startTime')}</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('groups.endTime')}</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{t('groups.lessonDays')}</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #003366',
                          background: formData.days.includes(day) ? '#003366' : '#fff',
                          color: formData.days.includes(day) ? '#fff' : '#003366',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontFamily: 'noto-m',
                        }}
                        onClick={() => toggleDay(day)}
                      >
                        {DAY_SHORT[day]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('groups.duration')}</label>
                  <div style={{
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '15px',
                    fontSize: '14px',
                    color: computedDuration > 0 ? '#003366' : '#aaa',
                    background: '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    {computedDuration > 0
                      ? <><strong>{computedDuration}</strong> {t('groups.hours')}</>
                      : t('groups.durationAuto')}
                  </div>
                  {computedDuration > 0 && (
                    <span style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
                      {t('groups.durationHint')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="primary" onClick={handleSubmit} disabled={isPending}>
                {isPending ? t('groups.saving') : t('groups.save')}
              </button>
              <button className="cancel" onClick={closeModal}>
                {t('groups.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal small">
            <h3>{t('groups.confirmDelete')}</h3>
            <div className="modal-actions">
              <button className="danger" onClick={confirmDelete}>{t('groups.confirm')}</button>
              <button className="cancel" onClick={() => setShowDeleteModal(false)}>{t('groups.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View modal ── */}
      {showViewModal && viewGroup && (
        <div className="modal-overlay">
          <div className="modal add-user-modal">
            <h3 className="modal-title">{viewGroup.name}</h3>

            <div className="add-user-form">
              <div className="form-left">
                <div className="form-group">
                  <label>{t('groups.branch')}</label>
                  <span className="view-field">
                    {viewGroup.branch ? getLocalized(viewGroup.branch, 'name', i18n.language) : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.course')}</label>
                  <span className="view-field">
                    {viewGroup.course ? getLocalized(viewGroup.course, 'name', i18n.language) : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.level')}</label>
                  <span className="view-field">
                    {viewGroup.level ? getLocalized(viewGroup.level, 'name', i18n.language) : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.teacher')}</label>
                  <span className="view-field">
                    {viewGroup.teacher
                      ? `${viewGroup.teacher.last_name} ${viewGroup.teacher.first_name}${viewGroup.teacher.middle_name ? ' ' + viewGroup.teacher.middle_name : ''}`
                      : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.room')}</label>
                  <span className="view-field">
                    {viewGroup.room ? (viewGroup.room.name_uz ?? viewGroup.room.name) : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.maxStudentsFull')}</label>
                  <span className="view-field">{viewGroup.max_students ?? '-'}</span>
                </div>
                <div className="form-group">
                  <label>{t('groups.durationView')}</label>
                  <span className="view-field">
                    {viewGroup.duration ? `${viewGroup.duration} ${t('groups.minutes')}` : '-'}
                  </span>
                </div>
              </div>

              <div className="form-right">
                <div className="form-group">
                  <label>{t('groups.startDateFull')}</label>
                  <span className="view-field">{viewGroup.start_date ?? '-'}</span>
                </div>
                <div className="form-group">
                  <label>{t('groups.endDateFull')}</label>
                  <span className="view-field">{viewGroup.end_date ?? '-'}</span>
                </div>
                <div className="form-group">
                  <label>{t('groups.lessonTime')}</label>
                  <span className="view-field">
                    {viewGroup.start_time && viewGroup.end_time
                      ? `${viewGroup.start_time.slice(0, 5)} – ${viewGroup.end_time.slice(0, 5)}`
                      : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.lessonDays')}</label>
                  <span className="view-field">
                    {viewGroup.days?.length
                      ? viewGroup.days.map((d) => DAY_LABELS[d] ?? d).join(', ')
                      : '-'}
                  </span>
                </div>
                <div className="form-group">
                  <label>{t('groups.studentsCount')}</label>
                  <span className="view-field">{viewGroup.students_count ?? '-'}</span>
                </div>
                <div className="form-group">
                  <label>{t('groups.createdAt')}</label>
                  <span className="view-field">
                    {viewGroup.created_at?.slice(0, 10).replaceAll('-', '.') ?? '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowViewModal(false)}>
                {t('groups.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="users-filters">
        <Protected permission="groups.create">
          <button className="add-new-user" onClick={openCreateModal}>{t('groups.addNew')}</button>
        </Protected>
        <Protected permission="groups.delete">
          <button
            className="delete-all"
            disabled={!selected.length}
            onClick={() => { selected.forEach((id) => deleteMutation.mutate(id)); setSelected([]); }}
          >
            {t('groups.delete')}
          </button>
        </Protected>
        <input placeholder={t('groups.search')} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* ── Table ── */}
      <div className="users-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selected.length === groups.length && groups.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
              <th className="th-sortable" onClick={() => setSortAsc((p) => !p)}>
                ID {sortAsc ? '↑' : '↓'}
              </th>
              <th>{t('groups.name')}</th>
              <th>{t('groups.branch')}</th>
              <th>{t('groups.course')}</th>
              <th>{t('groups.level')}</th>
              <th>{t('groups.teacher')}</th>
              <th>{t('groups.room')}</th>
              <th>{t('groups.daysLabel')}</th>
              <th>{t('groups.startDate')}</th>
              <th>{t('groups.endDate')}</th>
              <th>{t('groups.time')}</th>
              <th>{t('groups.maxStudents')}</th>
              <th>{t('groups.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rowCount={8} columnCount={14} />
            ) : groups.length > 0 ? (
              groups.map((g) => (
                <tr key={g.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(g.id)}
                      onChange={() => toggleOne(g.id)}
                    />
                  </td>
                  <td>{g.id}</td>
                  <td>{g.name}</td>
                  <td>{g.branch ? getLocalized(g.branch, 'name', i18n.language) : '-'}</td>
                  <td>{g.course ? getLocalized(g.course, 'name', i18n.language) : '-'}</td>
                  <td>{g.level ? getLocalized(g.level, 'name', i18n.language) : '-'}</td>
                  <td>{g.teacher ? `${g.teacher.last_name} ${g.teacher.first_name}` : '-'}</td>
                  <td>{g.room?.name_uz ?? g.room?.name ?? '-'}</td>
                  <td>{g.days?.length ? g.days.map((d) => DAY_SHORT[d] ?? d).join(', ') : '-'}</td>
                  <td>{g.start_date ?? '-'}</td>
                  <td>{g.end_date ?? '-'}</td>
                  <td>
                    {g.start_time && g.end_time
                      ? `${g.start_time.slice(0, 5)} – ${g.end_time.slice(0, 5)}`
                      : '-'}
                  </td>
                  <td>{g.max_students ?? '-'}</td>
                  <td className="actions">
                    <button
                      className="user-view-btn"
                      onClick={() => { setViewGroup(g); setShowViewModal(true); }}
                    >
                      <i className="fa-solid fa-eye" />
                    </button>
                    <Protected permission="groups.edit">
                      <button className="user-edit-btn" onClick={() => openEditModal(g)}>
                        <i className="fa-solid fa-pen" />
                      </button>
                    </Protected>
                    <Protected permission="groups.delete">
                      <button
                        className="user-delete-btn"
                        onClick={() => { setDeleteTarget(g.id); setShowDeleteModal(true); }}
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Protected>
                  </td>
                </tr>
              ))
            ) : (
              <EmptyState colSpan={14} message={t('groups.notFound')} />
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Groups;
