import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { origin, rpID } from '@/lib/webauthn';
import { prisma } from '@/lib/prisma';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  const body = await req.json();

  const expectedChallenge = session.challenge;
  const userId = session.userId;

  if (!expectedChallenge || !userId) {
    return new NextResponse(
      JSON.stringify({ error: 'Session is missing challenge or user ID.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false
    });

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return new NextResponse(
        JSON.stringify({ error: 'Could not verify registration.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // In v13+, credential data is nested inside the credential object
    const {
      credential: { id: credentialID, publicKey: credentialPublicKey, counter },
      credentialDeviceType,
      credentialBackedUp
    } = registrationInfo;

    // The `transports` property is on the root of the response, not in registrationInfo
    const transports = (body.response as any).transports || ['internal'];

    // Filter out 'hybrid' to prevent QR code option
    const platformOnly = transports.filter((t: string) => t === 'internal');

    await prisma.credential.create({
      data: {
        userId,
        credentialId: credentialID,
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        credentialDeviceType,
        backupEligible: credentialBackedUp,
        backupState: credentialBackedUp,
        transports: JSON.stringify(
          platformOnly.length > 0 ? platformOnly : ['internal']
        )
      }
    });

    // Clear the challenge and userId from the session
    session.challenge = undefined;
    session.userId = undefined;
    await session.save();

    return new NextResponse(JSON.stringify({ verified: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(resHeaders)
      }
    });
  } catch (error) {
    const err = error as Error;
    // Clear the challenge and userId from the session in case of error
    session.challenge = undefined;
    session.userId = undefined;
    await session.save();
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
