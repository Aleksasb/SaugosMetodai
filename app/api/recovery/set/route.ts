import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { prisma } from '@/lib/prisma';
import {
  hashPassword,
  validatePassword,
  verifyPassword,
  MAX_PASSWORD_LENGTH
} from '@/lib/password';
import { isLimited, recordFailure, resetFailures } from '@/lib/rateLimit';

// Set (or change) recovery info. Changing it requires the CURRENT recovery
// password (ASVS 6.2.3). Only for users who are already signed in,
// i.e. who just proved themselves with a passkey.
export async function POST(req: Request) {
  const { session } = await withSession(req);
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const birthYear = Number(body.birthYear);
  const maxYear = new Date().getFullYear();
  if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > maxYear) {
    return NextResponse.json(
      { error: `Birth year must be between 1900 and ${maxYear}.` },
      { status: 400 }
    );
  }

  const passwordError = validatePassword(body.password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  // First time setting it: no current password exists yet.
  // Changing it: the current one must be correct (and is rate limited).
  if (user.passwordHash) {
    const key = `change:${user.id}`;
    if (isLimited(key)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }
    const current =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const ok =
      current.length > 0 &&
      current.length <= MAX_PASSWORD_LENGTH &&
      (await verifyPassword(current, user.passwordHash));
    if (!ok) {
      recordFailure(key);
      return NextResponse.json(
        { error: 'Current recovery password is incorrect.' },
        { status: 403 }
      );
    }
    resetFailures(key);
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(body.password), birthYear }
  });

  return NextResponse.json({ ok: true });
}
