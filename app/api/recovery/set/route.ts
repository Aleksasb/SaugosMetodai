import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';

// Set (or change) recovery info. Only for users who are already signed in,
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

  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(body.password), birthYear }
  });

  return NextResponse.json({ ok: true });
}
