
function isBlobLike(val: unknown): val is Blob & { name?: string } {
  return (
    typeof val === "object" &&
    val !== null &&
    "size" in val &&
    typeof (val as { size: unknown }).size === "number" &&
    (val as { size: number }).size > 0 &&
    "arrayBuffer" in val &&
    typeof (val as { arrayBuffer: unknown }).arrayBuffer === "function"
  );
}
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { ensureInitialized, getState, saveFile, saveState } from '@/lib/arms/db';
import { applyCommand, publicSnapshot } from '@/lib/arms/service';
import { validateFileBytes } from '@/lib/arms/upload';
import type { Attachment } from '@/lib/arms/model';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    await ensureInitialized();
    const actor = requireAuth(request);
    const { caseId } = await params;
    const formData = await request.formData();

    const file = formData.get('file');
    const note = (formData.get('note') as string) || '';
    const version = Number(formData.get('version'));

    if (!isBlobLike(file)) {
      return NextResponse.json({ ok: false, error: 'Please choose a file to attach.' }, { status: 422 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { mime } = validateFileBytes((file as File).name, buffer);
    const fileId = `file-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const pendingFileRecord = {
      id: fileId,
      name: (file as File).name,
      mime,
      size: buffer.length,
      data: buffer,
      uploadedBy: actor.id,
      uploadedAt: now,
    };

    const attachment: Attachment = {
      id: fileId,
      name: (file as File).name,
      mime,
      size: buffer.length,
      uploadedBy: actor.id,
      uploadedAt: now,
    };

    const { state, version: currentVersion } = getState();
    applyCommand(
      state,
      actor,
      {
        action: 'evidence',
        caseId,
        version: Number.isFinite(version) ? version : state.cases.find((c) => c.id === caseId)?.version,
        note,
      },
      attachment,
    );

    // Only commit file after command validation passes
    await saveFile(pendingFileRecord);

    const nextVer = await saveState(state, currentVersion);
    const snapshot = publicSnapshot(state, actor, nextVer);

    return NextResponse.json({ ok: true, fileId, snapshot });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
