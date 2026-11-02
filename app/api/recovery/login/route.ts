import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { resetSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import {
  getDummyHash,
  verifyPassword,
  MAX_PASSWORD_LENGTH
} from '@/lib/password';
import { isLimited, recordFailure, resetFailures } from '@/lib/rateLimit';

const FAIL = { error: 'Recovery failed. Check your details and try again.' };

// Step 2 of recovery: password. Only works right after step 1 succeeded, and
// only ONE password attempt is allowed per successful step 1.
export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  const key = `recovery:${email}`;
  if (isLimited(key)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const stepOneOk =
    session.recoveryVerified === true && session.recoveryEmail === email;

  // one attempt per verification
  session.recoveryVerified = false;

  if (!email || !password || password.length > MAX_PASSWORD_LENGTH) {
    await session.save();
    recordFailure(key);
    return NextResponse.json(FAIL, { status: 401, headers: resHeaders });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always do one scrypt check so timing doesn't reveal anything.
  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash ?? (await getDummyHash())
  );

  if (!stepOneOk || !user || !user.passwordHash || !passwordOk) {
    await session.save();
    recordFailure(key);
    return NextResponse.json(FAIL, { status: 401, headers: resHeaders });
  }

  resetFailures(key);
  session.recoveryEmail = undefined;
  resetSession(session);
  session.userId = user.id;
  session.email = user.email;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json(
    { verified: true, user: { id: user.id, email: user.email } },
    { headers: resHeaders }
  );
}
