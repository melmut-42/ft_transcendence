import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ChatMount } from '@app/chat/ChatMount';
import { ModalHost } from '@app/modal/ModalHost';
import { RoomConnectionProvider } from '@app/connection/RoomConnectionProvider';
import { GameLayout } from '@layouts/GameLayout';
import { LobbyLayout } from '@layouts/LobbyLayout';
import { PublicLayout } from '@layouts/PublicLayout';
import { ROUTES } from '@shared/constants';

import { LandingPage } from '@app/pages/LandingPage';
import { PrivacyPage } from '@app/pages/PrivacyPage';
import { TermsPage } from '@app/pages/TermsPage';
import { LoginPage } from '@features/auth/pages/LoginPage';
import { RegisterPage } from '@features/auth/pages/RegisterPage';
import { LobbyPage } from '@features/lobby/pages/LobbyPage';
import { RoomPage } from '@features/room/pages/RoomPage';

import { RequireAnonymous } from './RequireAnonymous';
import { RequireAuth } from './RequireAuth';

/**
 * Route table.
 *
 * Public: landing, login, register, privacy, terms. Authenticated: lobby, room.
 * Profile is a modal rendered by `ModalHost`, not a route — so it never changes the
 * underlying screen and stays reachable from Lobby, Room and Game alike.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.landing} element={<LandingPage />} />
          <Route path={ROUTES.privacy} element={<PrivacyPage />} />
          <Route path={ROUTES.terms} element={<TermsPage />} />
          <Route element={<RequireAnonymous />}>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<LobbyLayout />}>
            <Route path={ROUTES.lobby} element={<LobbyPage />} />
          </Route>

          {/*
            Room and Game share one authoritative WebSocket, so the provider that owns
            it wraps the whole room route rather than living inside either feature.
          */}
          <Route element={<RoomConnectionProvider />}>
            <Route element={<GameLayout />}>
              <Route path={ROUTES.room} element={<RoomPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.landing} replace />} />
      </Routes>

      {/* App-level mounts: available from every layout, imported by no feature. */}
      <ModalHost />
      <ChatMount />
    </BrowserRouter>
  );
}
