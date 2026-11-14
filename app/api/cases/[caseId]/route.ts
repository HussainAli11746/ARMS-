import { getCaseResponse } from '@/lib/arms/api-contracts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return getCaseResponse(request, (await params).caseId);
}
