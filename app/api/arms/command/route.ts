import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { ensureInitialized, getState, saveState } from '@/lib/arms/db';
import { applyCommand, publicSnapshot } from '@/lib/arms/service';

export async function POST(request: Request) {
  try {
    await ensureInitialized();
    const actor = requireAuth(request);
    const body = (await request.json()) as { action: string; [key: string]: unknown };
    const expectedRevision = Number(body.revision);

    if (Number.isFinite(expectedRevision)) {
      const current = getState();
      if (current.version !== expectedRevision) {
        return NextResponse.json(
          {
            ok: false,
            error: 'This record was updated in another session. Please refresh before saving.',
            code: 'VERSION_CONFLICT',
          },
          { status: 409 },
        );
      }
    }

    const { state, version } = getState();
    const resultId = applyCommand(state, actor, body);
    const nextVersion = await saveState(state, version);
    const snapshot = publicSnapshot(state, actor, nextVersion);

    return NextResponse.json({ ok: true, resultId, snapshot });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
