/**
 * What the Log In and Register forms show for a failed request.
 *
 * A rejected field value goes back under its own field; everything else becomes the
 * form's alert. Only translation keys come out of here — the server's own `message` is
 * never shown, so no request detail reaches the screen.
 */

import { ApiError } from '@shared/api';

import type { RegisterField } from './validation';

export interface AuthAlert {
  tone: 'error' | 'success';
  title: string;
  body: string;
}

export type AuthFailure = { field: RegisterField; message: string } | { alert: AuthAlert };

const FIELD_ERRORS: Record<string, { field: RegisterField; message: string }> = {
  INVALID_EMAIL: { field: 'email', message: 'auth.validation.emailInvalid' },
  INVALID_USERNAME: { field: 'username', message: 'auth.validation.usernameInvalid' },
  INVALID_PASSWORD: { field: 'password', message: 'auth.validation.passwordInvalid' },
  EMAIL_TAKEN: { field: 'email', message: 'auth.feedback.emailTaken' },
  USERNAME_TAKEN: { field: 'username', message: 'auth.feedback.usernameTaken' },
};

const alert = (key: string): AuthFailure => ({
  alert: { tone: 'error', title: `auth.feedback.${key}Title`, body: `auth.feedback.${key}Body` },
});

export function authFailure(error: unknown): AuthFailure {
  if (!(error instanceof ApiError)) return alert('unavailable');

  const fieldError = FIELD_ERRORS[error.code];
  if (fieldError) return fieldError;

  switch (error.code) {
    // Returned alike for an unknown email and a wrong password, and shown alike.
    case 'INVALID_CREDENTIALS':
      return alert('credentials');
    case 'RATE_LIMITED':
      return alert('rateLimited');
    default:
      return alert('unavailable');
  }
}
