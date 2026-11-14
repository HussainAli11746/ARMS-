import { requireAuth } from '@/lib/arms/auth';
import { getState } from '@/lib/arms/db';
import { errorResponse } from '@/lib/arms/api-contracts';

export async function GET(request: Request) {
  try {
    const actor = requireAuth(request);
    const notifications = getState().state.notifications.filter(
      (item) => item.recipientId === actor.id,
    );
    return Response.json({ ok: true, notifications });
  } catch (error) {
    return errorResponse(error);
  }
}
