import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const ContractsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="contracts"
      title={t('archive.contractsTitle')}
      queryKey="contracts"
      columns={[
        { key: 'number', label: t('archive.contractNumber') },
        { key: 'student_name', label: t('users.fish') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default ContractsArchive;
