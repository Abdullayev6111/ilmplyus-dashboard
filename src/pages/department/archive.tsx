import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const DepartmentArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="departments"
      title={t('departments.archiveTitle')}
      queryKey="departments"
      columns={[
        { key: 'name', label: t('departments.name') },
        { key: 'code', label: t('departments.code') },
        {
          key: 'is_active',
          label: t('departments.status'),
          render: (item) => (item.is_active ? t('departments.active') : t('departments.inactive')),
        },
      ]}
    />
  );
};

export default DepartmentArchive;
