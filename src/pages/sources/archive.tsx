import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const SourcesArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="sources"
      title={t('sources.archiveTitle')}
      queryKey="sources"
      columns={[
        { key: 'name_uz', label: t('sources.nameUz') },
        { key: 'name_ru', label: t('sources.nameRu') },
        {
          key: 'created_at',
          label: t('sources.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default SourcesArchive;
