import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { rpID } from '@/lib/webauthn';
import { prisma } from '@/lib/prisma';
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  const { email } = await req.json();

  if (!email) {
    return new NextResponse(JSON.stringify({ error: 'Email is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: `User with email ${email} not found.` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Omit allowCredentials to enable Safari resident credential discovery.
    // With a clean passkey state, Safari will prompt for any discoverable credential
    // on this rpID. Once user confirms, we verify against stored credentials.
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred'
    });

    session.challenge = options.challenge;
    session.userId = user.id; // Store userId for verification step
    await session.save();

    return new NextResponse(JSON.stringify(options), {
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(resHeaders)
      }
    });
  } catch (error) {
    const err = error as Error;
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
