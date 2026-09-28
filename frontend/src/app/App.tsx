import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router/AppRouter';
import { LanguageSelector } from '@shared/i18n/LanguageSelector';

/** Application entry. Composition only — no feature behavior belongs here. */
export function App() {
  return (
    <AppProviders>
      <AppRouter />
      <LanguageSelector />
    </AppProviders>
  );
}
