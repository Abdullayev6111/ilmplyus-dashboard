import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const CoursesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="courses"
      title={t('courses.archiveTitle')}
      queryKey="courses"
      columns={[
        { key: 'name_uz', label: `${t('courses.courseName')} (UZ)` },
        { key: 'name_ru', label: `${t('courses.courseName')} (RU)` },
        {
          key: 'created_at',
          label: t('courses.createdDate'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default CoursesArchive;
