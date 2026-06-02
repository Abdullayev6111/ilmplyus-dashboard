import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const PositionsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="positions"
      title={t('positions.archiveTitle')}
      queryKey="positions"
      columns={[
        { key: 'name', label: t('positions.positionName') },
        {
          key: 'created_at',
          label: t('positions.createdDate'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default PositionsArchive;
