import { useState, useMemo } from 'react';
import { API } from '../../api/api';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './lessons.css';
import type { Group, Lesson } from '@/types/lesson.types';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '@/utils/getLocalized';

const uzDays: Record<string, string> = {
  monday: 'dushanba',
  tuesday: 'seshanba',
  wednesday: 'chorshanba',
  thursday: 'payshanba',
  friday: 'juma',
  saturday: 'shanba',
  sunday: 'yakshanba',
};

const dayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const formatTime = (time: string | undefined) => {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':');
};

const Lessons = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');

  // Selected lesson for viewing
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // Form state
  const [topic, setTopic] = useState('');
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [homeworkDescription, setHomeworkDescription] = useState('');
  const [homeworkFile, setHomeworkFile] = useState<File | null>(null);
  const [lessonDate, setLessonDate] = useState('');

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await API.get('/groups');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    },
  });

  const selectedGroup = useMemo(() => {
    return groups.find((g: Group) => g.id === selectedGroupId);
  }, [groups, selectedGroupId]);

  const dateOptions = useMemo(() => {
    if (!selectedGroup || !selectedGroup.days || selectedGroup.days.length === 0) return [];

    const options: { value: string; label: string }[] = [];
    const allowedDays = selectedGroup.days.map((d: string) => dayMap[d.toLowerCase()]);
    const startTime = formatTime(selectedGroup.start_time);
    const endTime = formatTime(selectedGroup.end_time);

    let current = new Date();
    // Agar start_date bugundan keyin bo'lsa, o'shandan boshlaymiz
    if (selectedGroup.start_date) {
      const start = new Date(selectedGroup.start_date);
      if (start > current) current = start;
    }

    // Keyingi 15 ta imkoniyatni qidiramiz
    let count = 0;
    let iterations = 0;
    const searchDate = new Date(current);

    while (count < 15 && iterations < 60) {
      if (allowedDays.includes(searchDate.getDay())) {
        const isoDate = searchDate.toISOString().split('T')[0];
        const dayName = Object.keys(dayMap).find(
          (key: string) => dayMap[key] === searchDate.getDay(),
        );
        const displayDay = dayName ? uzDays[dayName] : '';
        const label = `${searchDate.getDate()}-${
          [
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
          ][searchDate.getMonth()]
        }, ${displayDay} (${startTime}-${endTime})`;

        options.push({ value: isoDate, label });
        count++;
      }
      searchDate.setDate(searchDate.getDate() + 1);
      iterations++;
    }

    return options;
  }, [selectedGroup]);

  // jadval bosh turadi guruhni tanlaganda keyin darslar chiqadi
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['lessons', selectedGroupId, lessonDate],
    queryFn: async () => {
      const res = await API.get('/lessons', {
        params: { group_id: selectedGroupId },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      // Backend ushbu filterga javob bergan taqdirda ham, frontda xavfsizlik uchun qayta tekshiramiz
      return data.filter((lesson: Lesson) => {
        const matchesGroup = Number(lesson.group_id) === Number(selectedGroupId);
        const matchesDate = lessonDate ? lesson.date === lessonDate : true;
        return matchesGroup && matchesDate;
      });
    },
    enabled: !!selectedGroupId,
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await API.post('/lessons', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      notifications.show({
        title: t('studentTasks.notification.successTitle'),
        message: data?.message || t('studentTasks.notification.lessonSaved'),
        color: 'green',
      });
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      resetForm();
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const resetForm = () => {
    setTopic('');
    setLessonFile(null);
    setHomeworkTitle('');
    setHomeworkDescription('');
    setHomeworkFile(null);
    setSelectedLesson(null);
  };

  const handleOpenAdd = () => {
    if (!selectedGroupId) {
      notifications.show({
        title: t('studentTasks.notification.warningTitle'),
        message: t('studentTasks.notification.selectGroupFirst'),
        color: 'orange',
      });
      return;
    }
    resetForm();
    if (dateOptions.length > 0) {
      setLessonDate(dateOptions[0].value);
    }
    setIsModalOpen(true);
  };

  const handleView = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setTopic(lesson.topic);
    setHomeworkTitle(lesson.homework_title);
    setHomeworkDescription(lesson.homework_description);
    setLessonDate(lesson.date);
    setLessonFile(null); // Clear file inputs so new files can be attached if they want
    setHomeworkFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    const formData = new FormData();
    formData.append('group_id', String(selectedGroupId));
    formData.append('date', lessonDate || new Date().toISOString().split('T')[0]);
    formData.append('topic', topic);
    if (lessonFile) formData.append('lesson_file', lessonFile);
    formData.append('homework_title', homeworkTitle);
    formData.append('homework_description', homeworkDescription);
    if (homeworkFile) formData.append('homework_file', homeworkFile);

    mutation.mutate(formData);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const getFileName = (path: string | undefined) => {
    if (!path) return '';
    return path.split('/').pop();
  };

  return (
    <div className="lessons-container container">
      <div className="lessons-header">
        <div className="lessons-filters">
          <div className="filter-item">
            <label>{t('studentTasks.selectGroup')}</label>
            <select
              className="custom-select"
              value={selectedGroupId}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setSelectedGroupId(val);
                setLessonDate('');
              }}
            >
              <option value="">{t('studentTasks.selectGroupPlaceholder')}</option>
              {groups.map((g: Group) => (
                <option key={g.id} value={g.id}>
                  {g.name || getLocalized(g, 'name', lang)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>{t('studentTasks.nextLessonDate')}</label>
            <select
              className="custom-select"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              disabled={!selectedGroupId || dateOptions.length === 0}
            >
              {dateOptions.length === 0 ? (
                <option value="">{t('studentTasks.noDateAvailable')}</option>
              ) : (
                <>
                  <option value="">{t('studentTasks.selectDatePlaceholder')}</option>
                  {dateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
        <button className="add-lesson-btn" onClick={handleOpenAdd}>
          {t('studentTasks.addLesson')}
        </button>
      </div>

      <div className="lessons-table-wrapper">
        <table className="lessons-table">
          <thead>
            <tr>
              <th>{t('studentTasks.table.id')}</th>
              <th>{t('studentTasks.table.date')}</th>
              <th>{t('studentTasks.table.topic')}</th>
              <th>{t('studentTasks.table.lessonFile')}</th>
              <th>{t('studentTasks.table.homework')}</th>
              <th>{t('studentTasks.table.homeworkFile')}</th>
              <th>{t('studentTasks.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {!selectedGroupId ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    fontSize: '16px',
                    color: '#666',
                  }}
                >
                  {t('studentTasks.selectGroupHint')}
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    fontSize: '16px',
                    color: '#666',
                  }}
                >
                  {t('studentTasks.loading')}
                </td>
              </tr>
            ) : lessons.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: 'center',
                    padding: '30px',
                    fontSize: '16px',
                    color: '#666',
                  }}
                >
                  {lessonDate
                    ? t('studentTasks.noLessonForDate')
                    : t('studentTasks.noLessons')}
                </td>
              </tr>
            ) : (
              lessons.map((lesson: Lesson) => (
                <tr key={lesson.id}>
                  <td className="fw-700">{lesson.id}</td>
                  <td className="fw-700">{lesson.date}</td>
                  <td className="fw-700">{getLocalized(lesson, 'topic', lang)}</td>
                  <td>
                    {lesson.lesson_file && (
                      <a
                        href={lesson.lesson_file}
                        target="_blank"
                        rel="noreferrer"
                        className="table-link"
                      >
                        {getFileName(lesson.lesson_file)}
                      </a>
                    )}
                  </td>
                  <td className="fw-700">{getLocalized(lesson, 'homework_title', lang)}</td>
                  <td>
                    {lesson.homework_file && (
                      <a
                        href={lesson.homework_file}
                        target="_blank"
                        rel="noreferrer"
                        className="table-link"
                      >
                        {getFileName(lesson.homework_file)}
                      </a>
                    )}
                  </td>
                  <td>
                    <button className="view-btn" onClick={() => handleView(lesson)}>
                      {t('studentTasks.view')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="lt-modal-overlay">
          <div className="lt-modal">
            <div className="lt-modal-header">
              <h2>{selectedLesson ? t('studentTasks.modal.viewTitle') : t('studentTasks.modal.addTitle')}</h2>
              <p>
                {selectedGroup
                  ? selectedGroup.name || getLocalized(selectedGroup, 'name', lang)
                  : t('studentTasks.modal.groupFallback')}{' '}
                |{' '}
                {dateOptions.find((o) => o.value === lessonDate)?.label ||
                  lessonDate ||
                  t('studentTasks.modal.noDate')}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="lt-modal-body">
              <div className="lt-form-sections">
                <div className="lt-form-section">
                  <h3 className="lt-section-title">{t('studentTasks.modal.lessonSection')}</h3>

                  <div className="lt-form-group">
                    <label>
                      {t('studentTasks.modal.topicLabel')}<span className="lt-required">*</span>
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={t('studentTasks.modal.topicPlaceholder')}
                      required
                      className="lt-input"
                    />
                  </div>

                  <div className="lt-form-group">
                    <label>{t('studentTasks.modal.lessonFileLabel')}</label>
                    <div className="lt-file-wrapper">
                      <label className="lt-file-btn">
                        {t('studentTasks.modal.chooseFile')}
                        <input type="file" onChange={(e) => handleFileChange(e, setLessonFile)} />
                      </label>
                      <div className="lt-file-name">
                        {lessonFile
                          ? lessonFile.name
                          : selectedLesson?.lesson_file
                            ? getFileName(selectedLesson.lesson_file)
                            : ''}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lt-form-section">
                  <h3 className="lt-section-title">{t('studentTasks.modal.homeworkSection')}</h3>

                  <div className="lt-form-group">
                    <label>
                      {t('studentTasks.modal.homeworkTitleLabel')}<span className="lt-required">*</span>
                    </label>
                    <input
                      type="text"
                      value={homeworkTitle}
                      onChange={(e) => setHomeworkTitle(e.target.value)}
                      placeholder={t('studentTasks.modal.homeworkTitlePlaceholder')}
                      required
                      className="lt-input"
                    />
                  </div>

                  <div className="lt-form-group">
                    <label>{t('studentTasks.modal.homeworkDescLabel')}</label>
                    <textarea
                      value={homeworkDescription}
                      onChange={(e) => setHomeworkDescription(e.target.value)}
                      placeholder={t('studentTasks.modal.homeworkDescPlaceholder')}
                      className="lt-textarea"
                    ></textarea>
                  </div>

                  <div className="lt-form-group">
                    <label>{t('studentTasks.modal.homeworkFileLabel')}</label>
                    <div className="lt-file-wrapper">
                      <label className="lt-file-btn">
                        {t('studentTasks.modal.chooseFile')}
                        <input type="file" onChange={(e) => handleFileChange(e, setHomeworkFile)} />
                      </label>
                      <div className="lt-file-name">
                        {homeworkFile
                          ? homeworkFile.name
                          : selectedLesson?.homework_file
                            ? getFileName(selectedLesson.homework_file)
                            : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lt-modal-footer">
                <button type="submit" className="lt-save-btn" disabled={mutation.isPending}>
                  {mutation.isPending ? t('studentTasks.modal.saving') : t('studentTasks.modal.save')}
                </button>
                <button
                  type="button"
                  className="lt-cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t('studentTasks.modal.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lessons;
