import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uzJson from './messages/uz.json';
import ruJson from './messages/ru.json';
import enJson from './messages/en.json';

const resources = {
  uz: {
    translation: uzJson,
  },
  ru: {
    translation: ruJson,
  },
  en: {
    translation: enJson,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'uz',

  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
