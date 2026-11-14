import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/arms/auth';
import { ensureInitialized, getState } from '@/lib/arms/db';
import { isOversight } from '@/lib/arms/model';

export async function GET(request: Request) {
  try {
    await ensureInitialized();
    const actor = requireAuth(request);
    if (!isOversight(actor) && actor.role !== 'committee') {
      return NextResponse.json(
        { ok: false, error: 'Only administrative and committee roles may access case reports.' },
        { status: 403 },
      );
    }

    const { state } = getState();
    const url = new URL(request.url);
    const format = url.searchParams.get('format');

    const totalCases = state.cases.length;
    const activeCases = state.cases.filter((c) => c.status !== 'Closed').length;
    const closedCases = state.cases.filter((c) => c.status === 'Closed').length;

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byBody: Record<string, number> = {};

    for (const c of state.cases) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      byBody[c.assignedBody] = (byBody[c.assignedBody] || 0) + 1;
    }

    if (format === 'csv') {
      const header = 'Case ID,Category,Report Mode,Status,Initial Body,Assigned Body,Created At,Due Date\n';
      const rows = state.cases
        .map(
          (c) =>
            `"${c.id}","${c.category}","${c.reportMode}","${c.status}","${c.initialBody}","${c.assignedBody}","${c.createdAt}","${c.dueDate}"`,
        )
        .join('\n');
      return new Response(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="arms_cases_report.csv"',
        },
      });
    }

    return NextResponse.json({
      ok: true,
      summary: {
        totalCases,
        activeCases,
        closedCases,
        byCategory,
        byStatus,
        byBody,
      },
      cases: state.cases.map((c) => ({
        id: c.id,
        category: c.category,
        reportMode: c.reportMode,
        status: c.status,
        initialBody: c.initialBody,
        assignedBody: c.assignedBody,
        dueDate: c.dueDate,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status || 500;
    const errMsg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ ok: false, error: errMsg }, { status });
  }
}
