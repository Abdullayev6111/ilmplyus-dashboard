import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const RolesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="roles"
      title={t('archive.rolesTitle')}
      queryKey="roles"
      columns={[
        { key: 'name', label: t('roles.roleName') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default RolesArchive;
