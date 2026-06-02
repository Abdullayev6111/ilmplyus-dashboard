import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const TasksArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="tasks"
      title={t('archive.tasksTitle')}
      queryKey="tasks"
      columns={[
        { key: 'title', label: t('archive.taskTitle') },
        { key: 'status', label: t('users.status') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default TasksArchive;
