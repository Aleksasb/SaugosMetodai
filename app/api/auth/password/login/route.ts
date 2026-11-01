import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { prisma } from '@/lib/prisma';
import {
  getDummyHash,
  verifyPassword,
  MAX_PASSWORD_LENGTH
} from '@/lib/password';

const INVALID = { error: 'Invalid email or password.' };

export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  const { email: rawEmail, password } = await req.json().catch(() => ({}));

  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (
    !email ||
    typeof password !== 'string' ||
    !password ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return NextResponse.json(INVALID, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always run one scrypt verification (even for unknown users or
    // passkey-only accounts) so timing doesn't leak which emails exist.
    const ok = await verifyPassword(
      password,
      user?.passwordHash ?? (await getDummyHash())
    );

    if (!user || !user.passwordHash || !ok) {
      return NextResponse.json(INVALID, { status: 401 });
    }

    session.userId = user.id;
    session.email = user.email;
    session.isLoggedIn = true;
    session.challenge = undefined;
    await session.save();

    return NextResponse.json(
      { verified: true, user: { id: user.id, email: user.email } },
      { headers: resHeaders }
    );
  } catch (error) {
    console.error('Password login error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
