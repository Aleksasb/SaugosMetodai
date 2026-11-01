import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { origin, rpID } from '@/lib/webauthn';
import { prisma } from '@/lib/prisma';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export async function POST(req: Request) {
  try {
    const { session, resHeaders } = await withSession(req);
    const body = await req.json();
    const expectedChallenge = session.challenge;

    if (!expectedChallenge) {
      return new NextResponse(
        JSON.stringify({ error: 'No challenge in session' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const credentialId = body.id as string;

    let dbCred = await prisma.credential.findUnique({
      where: { credentialId },
      include: { user: true }
    });

    if (!dbCred) {
      return new NextResponse(
        JSON.stringify({ error: 'Unknown credential', credentialId }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: dbCred.credentialId,
        publicKey: Buffer.from(dbCred.publicKey, 'base64url'),
        counter: dbCred.counter,
        transports: dbCred.transports
          ? JSON.parse(dbCred.transports)
          : undefined
      }
    });

    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo) {
      return new NextResponse(JSON.stringify({ error: 'Auth failed' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }

    await prisma.credential.update({
      where: { id: dbCred.id },
      data: { counter: authenticationInfo.newCounter }
    });

    session.userId = dbCred.userId;
    session.email = dbCred.user.email;
    session.isLoggedIn = true;
    session.challenge = undefined;
    await session.save();

    return new NextResponse(
      JSON.stringify({
        verified: true,
        user: { id: dbCred.userId, email: dbCred.user.email }
      }),
      {
        headers: {
          'content-type': 'application/json',
          ...Object.fromEntries(resHeaders)
        }
      }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({
        error: 'Internal error',
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
}
