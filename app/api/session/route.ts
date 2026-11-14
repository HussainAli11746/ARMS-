import { requireAuth } from '@/lib/arms/auth';
import { errorResponse } from '@/lib/arms/api-contracts';

export async function GET(request: Request) {
  try {
    const user = requireAuth(request);
    return Response.json({ userId: user.id, role: user.role, name: user.name });
  } catch (error) {
    return errorResponse(error);
  }
}
