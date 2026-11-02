import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { prisma } from '@/lib/prisma';
import { isLimited, recordFailure } from '@/lib/rateLimit';

// Step 1 of recovery. ALWAYS answers the same way ("continue to password"),
// whether or not the email exists or the birth year is right, so it reveals
// nothing. The result is remembered only in the encrypted session.
export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  const body = await req.json().catch(() => ({}));
  const email =
    typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const birthYear = Number(body.birthYear);

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const key = `recovery:${email}`;
  if (isLimited(key)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = !!user && !!user.passwordHash && user.birthYear === birthYear;

  if (!ok) recordFailure(key);

  session.recoveryEmail = email;
  session.recoveryVerified = ok;
  await session.save();

  return NextResponse.json({ next: 'password' }, { headers: resHeaders });
}
