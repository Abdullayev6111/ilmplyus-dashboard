import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const BranchesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="branches"
      title={t('branches.archiveTitle')}
      queryKey="branches"
      columns={[
        { key: 'name', label: t('branches.name') },
        { key: 'address', label: t('branches.address') },
        { key: 'phone', label: t('branches.phoneNumber') },
        {
          key: 'is_active',
          label: t('branches.status'),
          render: (b) => (b.is_active ? t('branches.active') : t('branches.inactive')),
        },
        {
          key: 'created_at',
          label: t('branches.date'),
          render: (b) => (b.created_at ? String(b.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default BranchesArchive;
