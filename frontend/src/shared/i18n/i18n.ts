import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from './locales/tr.json';
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const LANGUAGE_FLAG = 'ft_transcendence.language';
const DEFAULT_LANGUAGE = 'en';

const savedLanguage = localStorage.getItem(LANGUAGE_FLAG) || DEFAULT_LANGUAGE;

function updateDocumentLanguage(language: string): void {
	document.documentElement.lang = language;
}

updateDocumentLanguage(savedLanguage);
i18n.on('languageChanged', updateDocumentLanguage);

void i18n.use(initReactI18next).init({
  resources: {
	tr: { translation: tr },
	en: { translation: en },
	fr: { translation: fr }
  },
  lng: savedLanguage,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
	escapeValue: false,
	},
});

export { DEFAULT_LANGUAGE, LANGUAGE_FLAG };
export default i18n;