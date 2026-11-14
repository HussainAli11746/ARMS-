import { postUndertakingReview } from '@/lib/arms/api-contracts';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ undertakingId: string }> },
) {
  return postUndertakingReview(request, (await params).undertakingId);
}
