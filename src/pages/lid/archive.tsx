import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const LidArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="lids"
      title={t('archive.lidTitle')}
      queryKey="lids"
      columns={[
        { key: 'name', label: t('users.fish') },
        { key: 'phone', label: t('users.phone') },
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

export default LidArchive;
