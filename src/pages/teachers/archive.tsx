import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const TeachersArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="teachers"
      title={t('archive.teachersTitle')}
      queryKey="teachers"
      columns={[
        { key: 'full_name', label: t('users.fish') },
        { key: 'phone', label: t('users.phone') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default TeachersArchive;
