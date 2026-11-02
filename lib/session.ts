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
