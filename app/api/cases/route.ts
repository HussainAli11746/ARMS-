import { isUploadedFile } from '@/lib/arms/upload';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/arms/auth';
import { getState, saveState } from '@/lib/arms/db';
import { applyCommand, publicSnapshot, DomainError } from '@/lib/arms/service';
import { anonymousReporter } from '@/lib/arms/model';
import { validateFileBytes } from '@/lib/arms/upload';
import type { Attachment } from '@/lib/arms/model';

export async function POST(request: Request) {
  try {
    const signedInUser = getSessionUser(request);
    const contentType = request.headers.get('content-type') || '';

    let commandData: { action: string; [key: string]: unknown } = {
      action: 'report',
    };
    let attachedFile: Attachment | undefined = undefined;
    let pendingFileToSave: {
      id: string;
      name: string;
      mime: string;
      size: number;
      data: Buffer;
      uploadedBy: string;
      uploadedAt: string;
    } | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const fields: Record<string, unknown> = {};
      let uploadedBlob: File | null = null;

      for (const [key, value] of formData.entries()) {
        if (key === 'evidence' && isUploadedFile(value)) {
          uploadedBlob = value as File;
        } else {
          fields[key] = value;
        }
      }

      commandData = {
        action: 'report',
        requestKey: fields.requestKey || crypto.randomUUID(),
        category: fields.category,
        description: fields.description,
        incidentDate: fields.incidentDate,
        incidentTime: fields.incidentTime,
        location: fields.location,
        people: fields.people,
        mode: fields.mode || 'named',
        confirmed: fields.confirmed === 'true' || fields.confirmed === true,
      };

      if (uploadedBlob) {
        const buffer = Buffer.from(await uploadedBlob.arrayBuffer());
        const { mime } = validateFileBytes(uploadedBlob.name, buffer);
        const fileId = `file-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const uploaderId =
          commandData.mode === 'anonymous'
            ? 'anonymous'
            : (signedInUser?.id ?? '');

        pendingFileToSave = {
          id: fileId,
          name: uploadedBlob.name,
          mime,
          size: buffer.length,
          data: buffer,
          uploadedBy: uploaderId,
          uploadedAt: now,
        };

        attachedFile = {
          id: fileId,
          name: uploadedBlob.name,
          mime,
          size: buffer.length,
          uploadedBy: uploaderId,
          uploadedAt: now,
        };
      }
    } else {
      commandData = await request.json();
      commandData.action = 'report';
    }

    // Only anonymous reporting is public; named reports still require sign-in.
    if (!signedInUser && commandData.mode !== 'anonymous') {
      throw new DomainError(401, 'Please sign in to submit a named report.');
    }
    const actor = signedInUser ?? anonymousReporter;
    const { state, version } = getState();
    const caseId = applyCommand(state, actor, commandData, attachedFile);

    const nextVersion = await saveState(
      state,
      version,
      pendingFileToSave ?? undefined,
    );
    const snapshot = publicSnapshot(state, actor, nextVersion);

    return NextResponse.json({ ok: true, caseId, snapshot }, { status: 201 });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
