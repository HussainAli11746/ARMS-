import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { getFile, getState } from '@/lib/arms/db';
import { authorizedFile } from '@/lib/arms/service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const actor = requireAuth(request);
    const { fileId } = await params;
    const { state } = getState();

    // Enforce role and record-level authorization check
    const meta = authorizedFile(state, actor, fileId);

    const fileRecord = getFile(meta.id);
    if (!fileRecord) {
      return NextResponse.json(
        { ok: false, error: 'File data not found in storage.' },
        { status: 404 },
      );
    }

    return new Response(new Uint8Array(fileRecord.data), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mime,
        'Content-Length': fileRecord.size.toString(),
        'Content-Disposition': `inline; filename="${fileRecord.name}"`,
      },
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
