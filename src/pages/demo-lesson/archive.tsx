import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const DemoLessonArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="demo-lessons"
      title={t('archive.demoLessonTitle')}
      queryKey="demo-lessons"
      columns={[
        { key: 'student_name', label: t('students.name') },
        { key: 'course_name', label: t('courses.courseName') },
        {
          key: 'date',
          label: t('users.createdAt'),
          render: (item) => (item.date ? String(item.date).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default DemoLessonArchive;
