import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const StudentsContractArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="students-contracts"
      title={t('archive.studentsContractTitle')}
      queryKey="students-contracts"
      columns={[
        { key: 'student_name', label: t('students.name') },
        { key: 'number', label: t('archive.contractNumber') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default StudentsContractArchive;
