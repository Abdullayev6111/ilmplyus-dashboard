import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const SalariesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="salaries"
      title={t('archive.salariesTitle')}
      queryKey="salaries"
      columns={[
        { key: 'employee_name', label: t('users.fish') },
        { key: 'amount', label: t('payments.amount') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default SalariesArchive;
