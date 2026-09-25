import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { ROUTES } from '@shared/constants';

import './Footer.css';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <nav aria-label={t('footer.navigation')}>
        <ul className="footer__legal-links">
          <li>
            <NavLink className="footer__link"  to={ROUTES.privacy}>{t('footer.privacyPolicy')}</NavLink>
          </li>
          <li>
            <NavLink className="footer__link" to={ROUTES.terms}>{t('footer.termsOfService')}</NavLink>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
