import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const LessonScheduleArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="lesson-schedules"
      title={t('archive.lessonScheduleTitle')}
      queryKey="lesson-schedules"
      columns={[
        { key: 'group_name', label: t('archive.groupName') },
        { key: 'room_name', label: t('rooms.roomName') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default LessonScheduleArchive;
