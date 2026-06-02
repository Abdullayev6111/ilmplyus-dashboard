import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const StudentsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="students"
      title={t('students.archiveTitle')}
      queryKey="students"
      columns={[
        { key: 'full_name', label: t('students.name') },
        { key: 'phone', label: t('students.phone') },
        { key: 'login', label: t('students.login') },
        {
          key: 'is_active',
          label: t('students.status'),
          render: (s) => (s.is_active ? t('students.active') : t('students.inactive')),
        },
        {
          key: 'created_at',
          label: t('students.createdAt'),
          render: (s) => (s.created_at ? String(s.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default StudentsArchive;
