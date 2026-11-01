import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';

export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  const { email: rawEmail, password } = await req.json().catch(() => ({}));

  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Never overwrite credentials on an existing account from an
      // unauthenticated request - that would be an account takeover.
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) }
    });

    session.userId = user.id;
    session.email = user.email;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json(
      { verified: true, user: { id: user.id, email: user.email } },
      { headers: resHeaders }
    );
  } catch (error) {
    console.error('Password register error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
