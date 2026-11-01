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
  }
}
