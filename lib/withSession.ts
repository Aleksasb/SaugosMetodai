import { getIronSession, IronSessionData } from 'iron-session';
import { sessionOptions } from './session';

export async function withSession(req: Request) {
  const res = new Response();
  const session = await getIronSession<IronSessionData>(req, res, sessionOptions);
  return { session, resHeaders: res.headers };
}
