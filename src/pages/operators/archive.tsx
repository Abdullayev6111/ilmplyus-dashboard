import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const OperatorsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="operators"
      title={t('archive.operatorsTitle')}
      queryKey="operators"
      columns={[
        { key: 'full_name', label: t('users.fish') },
        { key: 'phone', label: t('users.phone') },
        { key: 'username', label: t('users.loginText') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default OperatorsArchive;
