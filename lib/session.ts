import { SessionOptions } from 'iron-session';

export const sessionOptions: SessionOptions = {
  cookieName: 'app_session',
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true
  }
};

// Drops everything from the old session data before a login. The cookie is
// re-sealed on save(), so the browser gets a brand-new token that carries only
// the new login (ASVS 7.2.4) - no leftover challenge or recovery state.
export function resetSession(session: object) {
  const data = session as Record<string, unknown>;
  for (const key of Object.keys(data)) delete data[key];
}

declare module 'iron-session' {
  interface IronSessionData {
    userId?: string;
    email?: string;
    isLoggedIn?: boolean;
    challenge?: string;
    pendingUserId?: string; // user a passkey is being registered for (not logged in yet)
    recoveryEmail?: string; // email whose recovery info (birth year) was checked
    recoveryVerified?: boolean; // true only right after a correct birth year
  }
}
