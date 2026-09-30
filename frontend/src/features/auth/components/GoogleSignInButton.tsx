import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import googleMark from '@assets/auth/google-g.svg';
import { ROUTES } from '@shared/constants';

import { googleSignInUrl } from '../api';
import * as styles from './AuthDialog.styles';

/**
 * Continue with Google, under both the Log In and the Sign Up form.
 *
 * It leaves the app for Google by a full-page navigation to the server's authorize
 * endpoint; the server keeps every secret and sets the session cookies on the way back,
 * landing on the Lobby. A cancelled or failed sign-in comes back to Landing with an
 * `oauth_error`, which the Log In dialog explains. The button shows it is redirecting and
 * ignores further presses; if the browser brings the page back from its history cache,
 * the button is ready again.
 */
export function GoogleSignInButton() {
  const { t } = useTranslation();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const start = () => {
    if (redirecting) return;
    setRedirecting(true);
    window.location.assign(googleSignInUrl(ROUTES.lobby));
  };

  return (
    <>
      <p aria-hidden="true" className={styles.oauthDivider}>
        <span className={styles.oauthDividerLine} />
        {t('auth.oauth.or')}
        <span className={styles.oauthDividerLine} />
      </p>
      <button
        type="button"
        onClick={start}
        aria-busy={redirecting || undefined}
        aria-disabled={redirecting || undefined}
        className={styles.google}
      >
        <img src={googleMark} alt="" className={styles.googleMark} />
        {t(redirecting ? 'auth.oauth.redirecting' : 'auth.oauth.continue')}
      </button>
    </>
  );
}
