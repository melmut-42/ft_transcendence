import { LanguageSelector } from '@shared/i18n/LanguageSelector';

import './Header.css';

type HeaderVariant = 'public' | 'minimal';

type HeaderProps = {
  variant: HeaderVariant;
};

export function Header({ variant }: HeaderProps) {
  return (
    <header className={`header header--${variant}`}>
      <span className="header__brand">ft_transcendence</span>
      <LanguageSelector />
    </header>
  );
}