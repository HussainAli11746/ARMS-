import { isUploadedFile } from '@/lib/arms/upload';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { getState, saveState } from '@/lib/arms/db';
import { applyCommand, publicSnapshot } from '@/lib/arms/service';
import { validateFileBytes } from '@/lib/arms/upload';
import type { Attachment } from '@/lib/arms/model';

export async function POST(request: Request) {
  try {
    const actor = requireAuth(request);
    const formData = await request.formData();

    const file = formData.get('pdf') || formData.get('file');
    const session = (formData.get('session') as string) || '';
    const guardianName = (formData.get('guardianName') as string) || '';
    const confirmed = formData.get('confirmed') === 'true';
    const versionStr = formData.get('version');
    const version = versionStr ? Number(versionStr) : undefined;

    if (!isUploadedFile(file)) {
      return NextResponse.json(
        { ok: false, error: 'Upload a signed undertaking PDF document.' },
        { status: 422 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { mime } = validateFileBytes((file as File).name, buffer);
    if (mime !== 'application/pdf') {
      return NextResponse.json(
        { ok: false, error: 'The undertaking must be a valid PDF document.' },
        { status: 422 },
      );
    }

    const fileId = `file-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const pendingFileRecord = {
      id: fileId,
      name: (file as File).name,
      mime: 'application/pdf',
      size: buffer.length,
      data: buffer,
      uploadedBy: actor.id,
      uploadedAt: now,
    };

    const attachment: Attachment = {
      id: fileId,
      name: (file as File).name,
      mime: 'application/pdf',
      size: buffer.length,
      uploadedBy: actor.id,
      uploadedAt: now,
    };

    const { state, version: currentVersion } = getState();
    const undertakingId = applyCommand(
      state,
      actor,
      {
        action: 'undertaking',
        session,
        guardianName,
        confirmed,
        version,
      },
      attachment,
    );

    const nextVer = await saveState(state, currentVersion, pendingFileRecord);
    const snapshot = publicSnapshot(state, actor, nextVer);

    return NextResponse.json(
      { ok: true, undertakingId, snapshot },
      { status: 201 },
    );
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
