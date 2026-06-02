import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const LevelsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="levels"
      title={t('levels.archiveTitle')}
      queryKey="levels"
      columns={[
        { key: 'name', label: t('levels.levelName') },
        {
          key: 'created_at',
          label: t('levels.createdDate'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default LevelsArchive;
