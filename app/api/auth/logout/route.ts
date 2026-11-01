import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';

export async function POST(req: Request) {
  const { session, resHeaders } = await withSession(req);
  await session.destroy();
  return new NextResponse(null, { status: 204, headers: resHeaders });
}
