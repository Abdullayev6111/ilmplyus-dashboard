import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const UsersArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="users"
      title={t('users.archiveTitle')}
      queryKey="users"
      columns={[
        { key: 'full_name', label: t('users.fish') },
        { key: 'phone', label: t('users.phone') },
        { key: 'username', label: t('users.loginText') },
        { key: 'pinfl', label: t('users.pinfl') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (u) => (u.created_at ? String(u.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default UsersArchive;
