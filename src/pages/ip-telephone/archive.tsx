import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const IpTelephoneArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="ip-telephones"
      title={t('archive.ipTelephoneTitle')}
      queryKey="ip-telephones"
      columns={[
        { key: 'name', label: t('archive.name') },
        { key: 'number', label: t('archive.phoneNumber') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default IpTelephoneArchive;
