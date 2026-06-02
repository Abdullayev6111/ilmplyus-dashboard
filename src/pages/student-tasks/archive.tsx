import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const StudentTasksArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="student-tasks"
      title={t('archive.studentTasksTitle')}
      queryKey="student-tasks"
      columns={[
        { key: 'student_name', label: t('students.name') },
        { key: 'title', label: t('archive.taskTitle') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default StudentTasksArchive;
