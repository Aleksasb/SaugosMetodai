import { NextResponse } from 'next/server';
import { withSession } from '@/lib/withSession';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { session } = await withSession(req);

  if (!session.userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true }
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
