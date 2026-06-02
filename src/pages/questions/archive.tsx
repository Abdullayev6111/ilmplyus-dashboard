import { useTranslation } from 'react-i18next';
import ArchivePage from '../../components/ArchivePage';

const QuestionsArchive = () => {
  const { t } = useTranslation();
  return (
    <ArchivePage
      endpoint="questions"
      title={t('archive.questionsTitle')}
      queryKey="questions"
      columns={[
        { key: 'question', label: t('archive.questionText') },
        {
          key: 'created_at',
          label: t('users.createdAt'),
          render: (item) => (item.created_at ? String(item.created_at).slice(0, 10).replaceAll('-', '.') : '-'),
        },
      ]}
    />
  );
};

export default QuestionsArchive;
