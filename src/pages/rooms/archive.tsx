import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const RoomsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="rooms"
      title={t('rooms.archiveTitle')}
      queryKey="rooms"
      columns={[
        { key: 'name', label: t('rooms.roomName') },
        { key: 'capacity', label: t('rooms.capacity') },
        { key: 'floor', label: t('rooms.floor') },
      ]}
    />
  );
};

export default RoomsArchive;
