import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './LanguagePicker.module.css';

const langs = ['uz', 'ru', 'en'] as const;

export default function LanguageSelect() {
  const { i18n } = useTranslation();
  const [active, setActive] = useState(i18n.language || 'uz');

  const changeLang = (lng: string) => {
    setActive(lng);
    i18n.changeLanguage(lng);
  };

  return (
    <div className={classes.wrapper}>
      {langs.map((lang) => (
        <button
          key={lang}
          onClick={() => changeLang(lang)}
          className={`${classes.btn} ${active === lang ? classes.active : ''}`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
