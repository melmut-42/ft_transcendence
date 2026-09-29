import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_FLAG } from './i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'fr', label: 'Français' },
] as const;

/** Shared by the trigger and every option: a bare button that inherits type and color. */
const CONTROL_STYLES = 'appearance-none border-0 bg-transparent p-2 font-[inherit] text-inherit';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language).toUpperCase();

  function handleLanguageChange(language: string) {
    void i18n.changeLanguage(language);
    localStorage.setItem(LANGUAGE_FLAG, language);
    setIsMenuOpen(false);
  }

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleClickOutside);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div
      ref={selectorRef}
      className="fixed top-[clamp(0.75rem,2vw,1.5rem)] right-[clamp(0.75rem,2vw,1.5rem)] z-(--z-toast) bg-transparent"
    >
      <button
        type="button"
        className={`${CONTROL_STYLES} inline-flex cursor-pointer items-center gap-[0.4rem]`}
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
          className="absolute top-[calc(100%+0.5rem)] right-0 flex flex-col bg-transparent"
          role="group"
          aria-label={t('common.language')}
        >
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              className={`${CONTROL_STYLES} cursor-pointer text-left`}
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
