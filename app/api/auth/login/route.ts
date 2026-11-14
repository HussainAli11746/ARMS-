import { NextResponse } from 'next/server';
import { createSession, ensureInitialized, getState, verifyCredentials } from '@/lib/arms/db';

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const demoUserId = typeof body.demoUserId === 'string' ? body.demoUserId : undefined;

    let user = null;
    if (demoUserId) {
      // Demo login shortcut for viva evaluation
      const { state } = getState();
      user = state.users.find((u) => u.id === demoUserId && u.active);
    } else if (email && password) {
      user = verifyCredentials(email, password);
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Invalid institutional credentials or inactive account.' },
        { status: 401 },
      );
    }

    const token = createSession(user.id);
    const response = NextResponse.json({
      ok: true,
      user,
      token,
      message: `Signed in as ${user.name} (${user.role}).`,
    });

    response.cookies.set('arms_session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400,
    });

    return response;
  } catch (err: unknown) {
    console.error('LOGIN ERROR:', err);
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
