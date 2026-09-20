import { Link } from 'react-router-dom';

import { ROUTES } from '@shared/constants';

/**
 * Footer present on every layout, public and authenticated.
 *
 * The Privacy and Terms links are subject-mandatory; their absence is a rejection
 * risk, so the footer is part of the layout foundation rather than a page detail.
 */
export function Footer() {
  return (
    <footer>
      <nav aria-label="Legal">
        <Link to={ROUTES.privacy}>Privacy Policy</Link>
        <Link to={ROUTES.terms}>Terms of Service</Link>
      </nav>
    </footer>
  );
}
