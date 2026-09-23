import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_FLAG } from  './i18n';

import './languageSelector.css';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'fr', label: 'Français' },
] as const;


export function LanguageSelector() {
	const { i18n, t } = useTranslation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const currentLanguage = (
	i18n.resolvedLanguage ?? i18n.language
  ).toUpperCase();

  function handleLanguageChange(language: string) {
	void i18n.changeLanguage(language);
	localStorage.setItem(LANGUAGE_FLAG, language);
	setIsMenuOpen(false);
  }

  return (
	<div className="language-selector">
	  <button
		type="button"
		className="language-selector__trigger"
		onClick={() => setIsMenuOpen(!isMenuOpen)}
		aria-expanded={isMenuOpen}
		aria-controls="language-selector-menu"
	  >
		<span aria-hidden="true">🌐</span>
		<span>{currentLanguage}</span>
	  </button>

	  {isMenuOpen && (
		<div
		  id="language-selector-menu"
		  className="language-selector__menu"
		  role="group"
		  aria-label={t('common.language')}
		>
		  {LANGUAGES.map(({ code, label }) => (
			<button
			  key={code}
			  type="button"
			  className="language-selector__option"
			  onClick={() => handleLanguageChange(code)}
			  aria-pressed={i18n.resolvedLanguage === code}
			>
			  {label}
			</button>
		  ))}
		</div>
	  )}
	</div>
  );
}
