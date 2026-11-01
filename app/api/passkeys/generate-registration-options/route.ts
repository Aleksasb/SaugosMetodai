import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { rpID } from '@/lib/webauthn';
import { prisma } from '@/lib/prisma';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { TextEncoder } from 'util';

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
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email } });
    }

    const existingCredentials = await prisma.credential.findMany({
      where: { userId: user.id }
    });

    const options = await generateRegistrationOptions({
      rpName: 'Passkeys Next.js Example',
      rpID,
      userID: new TextEncoder().encode(user.id.toString()),
      userName: user.email,
      userDisplayName: user.email,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: cred.transports ? JSON.parse(cred.transports) : undefined
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Force platform authenticator (Touch ID, Face ID)
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'preferred'
      }
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
