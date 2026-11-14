import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { resetDatabase, getState } from '@/lib/arms/db';
import { publicSnapshot } from '@/lib/arms/service';

export async function POST(request: Request) {
  try {
    const actor = requireAuth(request);
    if (actor.role !== 'administrator') {
      return NextResponse.json(
        { ok: false, error: 'Only administrators may reset demonstration data.' },
        { status: 403 },
      );
    }
    await resetDatabase();
    const { state, version } = getState();
    const snapshot = publicSnapshot(state, actor, version);
    return NextResponse.json({ ok: true, message: 'Database reset to initial demo state.', snapshot });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
