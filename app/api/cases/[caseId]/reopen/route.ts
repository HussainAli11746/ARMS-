import { postCaseAction } from '@/lib/arms/api-contracts';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  return postCaseAction(request, (await params).caseId, 'reopen');
}
