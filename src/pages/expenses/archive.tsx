import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const ExpensesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="expenses"
      title={t('expenses.archiveTitle')}
      queryKey="expenses"
      columns={[
        { key: 'category_name', label: t('expenses.expenseCategory') },
        { key: 'amount', label: t('expenses.amount') },
        { key: 'branch_name', label: t('expenses.branch') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default ExpensesArchive;
