// Named endpoints from the interface design reuse the existing business rules.
import { requireAuth } from './auth';
import { getState } from './db';
import { canViewCase, nextStatus } from './model';
import { DomainError, publicSnapshot } from './service';
import { POST as executeCommand } from '@/app/api/arms/command/route';

export function errorResponse(error: unknown): Response {
  const status = error instanceof DomainError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Internal error';
  return Response.json({ ok: false, error: message }, { status });
}

export async function getCaseResponse(
  request: Request,
  caseId: string,
  transitionsOnly = false,
) {
  try {
    const actor = requireAuth(request);
    const { state, version } = getState();
    const record = state.cases.find((item) => item.id === caseId);
    if (!record || !canViewCase(actor, record))
      throw new DomainError(404, 'Case not available to this account.');
    if (transitionsOnly) {
      const next = nextStatus(actor, record);
      return Response.json({
        ok: true,
        currentStatus: record.status,
        allowedStatuses: next ? [next] : [],
        canReopen: actor.role === 'committee' && record.status === 'Closed',
      });
    }
    const visibleCase = publicSnapshot(state, actor, version).cases.find(
      (item) => item.id === caseId,
    );
    return Response.json({ ok: true, case: visibleCase });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function postCaseAction(
  request: Request,
  caseId: string,
  action: 'status' | 'reopen',
) {
  try {
    const input = await request.json();
    const command = {
      ...input,
      action,
      caseId,
      version: input.expectedVersion ?? input.version,
      note: input.actionNote ?? input.reason ?? input.note,
    };
    const response = await executeCommand(
      new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(command),
      }),
    );
    const result = await response.json();
    const record = result.snapshot?.cases.find(
      (item: { id: string }) => item.id === caseId,
    );
    return Response.json(
      {
        ...result,
        caseId,
        status: record?.status,
        version: record?.version,
        historyId: record?.history.at(-1)?.id,
      },
      { status: response.status },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function postUndertakingReview(
  request: Request,
  undertakingId: string,
) {
  try {
    const input = await request.json();
    let decision = input.decision;
    if (decision === 'accept') decision = 'Accepted/Verified';
    if (decision === 'reject') decision = 'Rejected';
    const command = {
      ...input,
      action: 'review',
      undertakingId,
      decision,
      version: input.expectedVersion ?? input.version,
    };
    const response = await executeCommand(
      new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(command),
      }),
    );
    const result = await response.json();
    const record = result.snapshot?.undertakings.find(
      (item: { id: string }) => item.id === undertakingId,
    );
    return Response.json(
      {
        ...result,
        undertakingId,
        status: record?.status,
        reviewId: record?.reviews.at(-1)?.id,
      },
      { status: response.status },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
