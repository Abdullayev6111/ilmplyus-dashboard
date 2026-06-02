import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const CoursePricesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="course_prices"
      title={t('archive.coursePricesTitle')}
      queryKey="course_prices"
      columns={[
        { key: 'price', label: t('archive.price') },
        { key: 'course_name', label: t('courses.courseName') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default CoursePricesArchive;
