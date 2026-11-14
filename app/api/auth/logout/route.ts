import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/arms/db';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/arms_session=([a-f0-9]+)/);
    if (match) {
      deleteSession(match[1]);
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      deleteSession(authHeader.slice(7).trim());
    }

    const response = NextResponse.json({
      ok: true,
      message: 'Logged out successfully.',
    });
    response.cookies.set('arms_session', '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 0,
    });
    return response;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
