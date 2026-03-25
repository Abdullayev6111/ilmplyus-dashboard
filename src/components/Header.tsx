import userIcon from '../assets/images/user-icon.svg';
import LanguageSelect from './LanguageSelect/LanguageSelect';
import { useTranslation } from 'react-i18next';

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="header">
      <LanguageSelect />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div className="user-icon-circle">
          <img src={userIcon} alt="" />
        </div>

        <div>
          <h1 className="user-name">Obidov Ibrohim</h1>
          <p className="user-role">{t('header.administrator')}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
