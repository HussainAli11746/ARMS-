import { requireAuth } from '@/lib/arms/auth';
import { getState } from '@/lib/arms/db';
import { errorResponse } from '@/lib/arms/api-contracts';

export async function GET(request: Request) {
  try {
    requireAuth(request);
    const body = new URL(request.url).searchParams.get('body');
    const members = getState().state.directory.filter(
      (item) => item.active && (!body || item.body === body),
    );
    return Response.json({ ok: true, members });
  } catch (error) {
    return errorResponse(error);
  }
}
