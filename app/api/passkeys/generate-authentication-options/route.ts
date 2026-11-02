import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { rpID } from '@/lib/webauthn';
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
    // We deliberately do NOT look the user up or return an error for unknown
    // emails. The options are identical for everyone (no allowCredentials), so
    // an attacker can't tell whether an account exists. Unknown users simply
    // fail later, at verification, with a generic message.
    // Omit allowCredentials to enable Safari resident credential discovery.
    // With a clean passkey state, Safari will prompt for any discoverable credential
    // on this rpID. Once user confirms, we verify against stored credentials.
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred'
    });

    session.challenge = options.challenge;
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
