import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { ensureInitialized, getState, saveState } from '@/lib/arms/db';
import { generateDeadlineNotifications, publicSnapshot } from '@/lib/arms/service';

export async function GET(request: Request) {
  try {
    await ensureInitialized();
    const actor = requireAuth(request);
    const { state } = getState();
    let { version } = getState();

    // Check deadlines and generate notifications if needed
    if (generateDeadlineNotifications(state)) {
      try {
        version = await saveState(state, version);
      } catch {}
    }

    const snapshot = publicSnapshot(state, actor, version);
    return NextResponse.json({ ok: true, snapshot });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
