import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const GroupsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="groups"
      title={t('archive.groupsTitle')}
      queryKey="groups"
      columns={[
        { key: 'name', label: t('archive.groupName') },
        { key: 'course_name', label: t('courses.courseName') },
        { key: 'teacher_name', label: t('aside.teachers') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default GroupsArchive;
