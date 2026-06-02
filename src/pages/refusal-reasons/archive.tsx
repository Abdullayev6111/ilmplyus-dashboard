import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const RefusalReasonsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="refusal-reasons"
      title={t('refusalReasons.archiveTitle')}
      queryKey="refusal-reasons"
      columns={[
        { key: 'name', label: t('refusalReasons.name') },
        { key: 'comment', label: t('refusalReasons.comment') },
        {
          key: 'created_at',
          label: t('refusalReasons.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default RefusalReasonsArchive;
