import {
  canViewCase,
  categories,
  deadlineState,
  isHandler,
  isOversight,
  nextStatus,
  roleLabels,
} from './model.ts';
import type {
  Attachment,
  Body,
  CaseRecord,
  DirectoryEntry,
  Role,
  Snapshot,
  State,
  User,
} from './model.ts';

export class DomainError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
  }
}

export type Command = { action: string; [key: string]: unknown };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const requireText = (value: unknown, label: string) => {
  const result = text(value);
  if (!result) throw new DomainError(422, `${label} is required.`);
  return result;
};
const requireRole = (actor: User, roles: Role[]) => {
  if (!roles.includes(actor.role)) {
    throw new DomainError(403, 'Your account is not permitted to perform this action.');
  }
};
const id = () => crypto.randomUUID();

export function audit(
  state: State,
  actor: User,
  action: string,
  targetId: string,
  at: string,
  details?: string,
) {
  state.audit.push({
    id: id(),
    actorId: actor.id,
    actor: actor.name,
    action,
    targetId,
    at,
    details,
  });
}

export function notify(
  state: State,
  recipientId: string | null,
  message: string,
  targetId: string,
  at: string,
  key?: string,
) {
  if (!recipientId || (key && state.notifications.some((n) => n.key === key))) return;
  state.notifications.push({
    id: id(),
    recipientId,
    message,
    targetId,
    at,
    read: false,
    key,
  });
}

export function bodyMembers(state: State, body: Body) {
  if (body === 'Administrator review') {
    return state.users.filter((u) => u.active && u.role === 'administrator');
  }
  const role = body === 'Anti-Ragging Squad' ? 'squad' : 'committee';
  return state.users.filter(
    (u) =>
      u.active &&
      u.role === role &&
      state.directory.some((d) => d.active && d.body === body && d.userId === u.id),
  );
}

export function notifyBody(state: State, body: Body, message: string, targetId: string, at: string) {
  for (const user of bodyMembers(state, body)) {
    notify(state, user.id, message, targetId, at);
  }
}

function caseFor(state: State, actor: User, input: Command) {
  const record = state.cases.find((c) => c.id === input.caseId);
  if (!record || !canViewCase(actor, record)) {
    throw new DomainError(404, 'Case not available to this account.');
  }
  if (record.version !== input.version) {
    throw new DomainError(409, 'This case changed. Refresh it before saving your update.');
  }
  return record;
}

function history(
  record: CaseRecord,
  actor: User,
  to: CaseRecord['status'],
  note: string,
  at: string,
) {
  record.history.push({
    id: id(),
    from: record.status,
    to,
    note,
    actorId: actor.id,
    actor: actor.name,
    at,
  });
  record.status = to;
  record.version++;
  record.updatedAt = at;
}

export function routeFor(state: State, category: string): Body {
  if (category === 'Online harassment') {
    const committeeCount = bodyMembers(state, 'Anti-Ragging Committee').length;
    return committeeCount > 0 ? 'Anti-Ragging Committee' : 'Administrator review';
  }
  if (category === 'Other ragging-related incident') {
    return 'Administrator review';
  }
  const squadCount = bodyMembers(state, 'Anti-Ragging Squad').length;
  return squadCount > 0 ? 'Anti-Ragging Squad' : 'Administrator review';
}

export function generateUniqueCaseId(state: State, year: string): string {
  let maxSeq = 0;
  const prefix = `ARMS-${year}-`;
  for (const c of state.cases) {
    if (c.id.startsWith(prefix)) {
      const rest = c.id.slice(prefix.length);
      const parsed = parseInt(rest, 10);
      if (Number.isFinite(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }
  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  while (state.cases.some((c) => c.id === candidate)) {
    nextSeq++;
    candidate = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }
  return candidate;
}

export function applyCommand(
  state: State,
  actor: User,
  input: Command,
  file?: Attachment,
  at = new Date().toISOString(),
): string {
  if (!actor.active) throw new DomainError(403, 'This account is inactive.');
  const action = requireText(input.action, 'Action');

  if (action === 'report') {
    requireRole(actor, ['student']);
    const requestKey = requireText(input.requestKey, 'Submission reference');
    const anonymous = input.mode === 'anonymous';
    const duplicate = state.requests.find((r) => r.key === requestKey && (anonymous ? r.userId === 'anonymous' : r.userId === actor.id));
    if (duplicate) return duplicate.resultId;

    const category = requireText(input.category, 'Category');
    if (!(categories as readonly string[]).includes(category)) {
      throw new DomainError(422, 'Select a valid report category.');
    }
    const description = requireText(input.description, 'Incident description');
    const incidentDate = text(input.incidentDate);
    const incidentTime = text(input.incidentTime);

    if (
      incidentDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate) || !Number.isFinite(Date.parse(incidentDate)))
    ) {
      throw new DomainError(422, 'Enter a valid incident date.');
    }
    if (incidentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(incidentTime)) {
      throw new DomainError(422, 'Enter a valid time or leave it blank.');
    }
    if (
      incidentDate &&
      Date.parse(`${incidentDate}T${incidentTime || '00:00'}:00+05:30`) > Date.parse(at)
    ) {
      throw new DomainError(422, 'The incident cannot be dated in the future.');
    }
    if (input.confirmed !== true) {
      throw new DomainError(422, 'Confirm the report before submitting.');
    }

    const year = at.slice(0, 4);
    const caseId = generateUniqueCaseId(state, year);
    if (state.cases.some((c) => c.id === caseId)) {
      throw new DomainError(500, 'Collision detected allocating unique case identifier.');
    }
    const body = routeFor(state, category);

    // Initial due date: 7 days from filing
    const dueAt = new Date(Date.parse(at) + 7 * 86400000).toISOString().slice(0, 10);

    const record: CaseRecord = {
      id: caseId,
      reporterId: anonymous ? null : actor.id,
      reportMode: anonymous ? 'anonymous' : 'named',
      category,
      description,
      incidentDate,
      incidentTime,
      location: text(input.location),
      people: text(input.people),
      status: 'Reported',
      initialBody: body,
      assignedBody: body,
      dueDate: dueAt,
      createdAt: at,
      updatedAt: at,
      version: 0,
      evidence: file ? [{ ...file, uploadedBy: anonymous ? 'anonymous' : actor.id }] : [],
      history: [],
    };

    const systemUser: User = {
      id: 'system',
      name: 'ARMS',
      email: '',
      role: 'administrator',
      active: true,
    };

    history(
      record,
      systemUser,
      'Acknowledged',
      `Report received and accepted. Initial assignment: ${body}.`,
      at,
    );
    state.cases.push(record);

    audit(
      state,
      anonymous ? systemUser : actor,
      `Report received: ${caseId} (${anonymous ? 'Anonymous' : 'Named'})`,
      caseId,
      at,
    );

    notifyBody(state, body, `${caseId} needs initial review (${category}).`, caseId, at);
    if (!anonymous) {
      notify(state, record.reporterId, `${caseId} received: Acknowledged.`, caseId, at);
    }

    state.requests.push({ key: requestKey, userId: anonymous ? 'anonymous' : actor.id, resultId: caseId });
    return caseId;
  }

  if (['status', 'reopen', 'caseDetails', 'evidence', 'assign'].includes(action)) {
    const record = caseFor(state, actor, input);

    if (action === 'assign') {
      requireRole(actor, ['administrator']);
      const body = text(input.body) as Body;
      if (!['Anti-Ragging Squad', 'Anti-Ragging Committee'].includes(body)) {
        throw new DomainError(422, 'Select a valid handling body.');
      }
      if (!bodyMembers(state, body).length) {
        throw new DomainError(
          422,
          'This body has no active linked member. Update the directory first.',
        );
      }
      if (record.status === 'Closed') {
        throw new DomainError(409, 'Reopen the case before changing its assignment.');
      }
      if (
        ['Escalated to Committee', 'Committee Decision Recorded', 'Action Taken'].includes(
          record.status,
        ) &&
        body !== 'Anti-Ragging Committee'
      ) {
        throw new DomainError(422, 'This stage requires Committee handling.');
      }
      const note = requireText(input.note, 'Assignment reason');
      const prevBody = record.assignedBody;
      record.assignedBody = body;
      record.version++;
      record.updatedAt = at;
      record.history.push({
        id: id(),
        from: record.status,
        to: record.status,
        note: `Reassigned from ${prevBody} to ${body}: ${note}`,
        actorId: actor.id,
        actor: actor.name,
        at,
      });
      audit(state, actor, `Reassigned ${record.id} to ${body}`, record.id, at);
      notifyBody(state, body, `${record.id} was assigned to your body: ${note}`, record.id, at);
      return record.id;
    }

    if (!isHandler(actor)) {
      throw new DomainError(403, 'Only an authorized case handler may change this record.');
    }

    if (action === 'reopen') {
      requireRole(actor, ['committee']);
      if (record.status !== 'Closed') {
        throw new DomainError(409, 'Only a closed case can be reopened.');
      }
      const note = requireText(input.note ?? input.reason, 'Reopening reason');
      history(record, actor, 'Under Investigation', `Case reopened: ${note}`, at);
      audit(state, actor, `Case reopened: ${record.id} - ${note}`, record.id, at);
      notify(state, record.reporterId, `${record.id} was reopened for investigation.`, record.id, at);
      notifyBody(
        state,
        record.assignedBody,
        `${record.id} was reopened: ${note}`,
        record.id,
        at,
      );
      return record.id;
    }

    if (record.status === 'Closed') {
      throw new DomainError(409, 'Reopen the case before making further changes.');
    }

    if (action === 'status') {
      const next = nextStatus(actor, record);
      if (!next || next !== input.nextStatus) {
        throw new DomainError(422, 'That status transition is not permitted.');
      }
      if (next === 'Escalated to Committee' && !bodyMembers(state, 'Anti-Ragging Committee').length) {
        throw new DomainError(
          422,
          'No active Committee member is configured. Ask the administrator to update the directory.',
        );
      }
      const note = requireText(input.note, 'Finding or action note');
      history(record, actor, next, note, at);
      if (next === 'Escalated to Committee') {
        record.assignedBody = 'Anti-Ragging Committee';
      }
      audit(state, actor, `Case status changed to ${next}: ${record.id}`, record.id, at);
      notify(state, record.reporterId, `${record.id}: status updated to ${next}.`, record.id, at);
      notifyBody(state, record.assignedBody, `${record.id}: status updated to ${next}.`, record.id, at);
      return record.id;
    }

    if (action === 'evidence') {
      if (!file) throw new DomainError(422, 'Choose an evidence file.');
      const note = text(input.note);
      record.evidence.push(file);
      record.version++;
      record.updatedAt = at;
      record.history.push({
        id: id(),
        from: record.status,
        to: record.status,
        note: `Additional evidence attached: ${file.name}${note ? ` (${note})` : ''}`,
        actorId: actor.id,
        actor: actor.name,
        at,
      });
      audit(state, actor, `Additional evidence attached to ${record.id}: ${file.name}`, record.id, at);
      return record.id;
    }

    if (action === 'caseDetails') {
      const category = requireText(input.category, 'Category');
      if (!(categories as readonly string[]).includes(category)) {
        throw new DomainError(422, 'Choose a valid category.');
      }
      const dueDate = text(input.dueDate);
      if (
        dueDate &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(dueDate)))
      ) {
        throw new DomainError(422, 'Enter a valid due date.');
      }
      const note = requireText(input.note, 'Change reason');
      record.version++;
      record.updatedAt = at;
      record.history.push({
        id: id(),
        from: record.status,
        to: record.status,
        note: `Case details updated: Category: ${record.category} -> ${category}; Due date: ${
          record.dueDate || 'not set'
        } -> ${dueDate || 'not set'}. Reason: ${note}`,
        actorId: actor.id,
        actor: actor.name,
        at,
      });
      record.category = category;
      record.dueDate = dueDate;
      audit(state, actor, `Updated category/deadline on ${record.id}`, record.id, at);
      return record.id;
    }
  }

  if (action === 'undertaking') {
    requireRole(actor, ['student', 'parent']);
    const studentId = actor.role === 'parent' ? actor.studentId : actor.id;
    if (!studentId || !state.users.some((u) => u.id === studentId && u.role === 'student' && u.active)) {
      throw new DomainError(403, 'No active student is linked to this account.');
    }
    if (!file || file.mime !== 'application/pdf') {
      throw new DomainError(422, 'Upload a signed PDF document.');
    }
    if (input.confirmed !== true) {
      throw new DomainError(422, 'Confirm the declaration before submitting.');
    }
    const session = requireText(input.session, 'Academic session');
    if (!/^\d{4}-\d{2}$/.test(session)) {
      throw new DomainError(422, 'Use an academic session such as 2026-27.');
    }

    let record = state.undertakings.find(
      (u) => u.studentId === studentId && u.session === session,
    );

    if (record) {
      if (record.status === 'Accepted/Verified') {
        throw new DomainError(409, 'This session already has an accepted undertaking.');
      }
      if (record.status === 'Pending Verification') {
        throw new DomainError(409, 'An undertaking for this session is already awaiting verification.');
      }
      // If Rejected, resubmission is permitted!
      if (record.version !== input.version) {
        throw new DomainError(409, 'This undertaking changed. Refresh before resubmitting.');
      }
      record.status = 'Pending Verification';
      record.guardianName = text(input.guardianName) || record.guardianName;
      record.version++;
      record.submissions.push({
        id: id(),
        file,
        submittedBy: actor.id,
        at,
      });
    } else {
      record = {
        id: id(),
        studentId,
        session,
        guardianName: text(input.guardianName),
        status: 'Pending Verification',
        version: 1,
        submissions: [
          {
            id: id(),
            file,
            submittedBy: actor.id,
            at,
          },
        ],
        reviews: [],
      };
      state.undertakings.push(record);
    }

    audit(state, actor, `Undertaking submitted for student ${studentId} (${session})`, record.id, at);
    notifyBody(
      state,
      'Administrator review',
      `Signed undertaking submitted for session ${session} needs verification.`,
      record.id,
      at,
    );
    return record.id;
  }

  if (action === 'review') {
    requireRole(actor, ['administrator', 'squad', 'committee', 'oversight']);
    const record = state.undertakings.find((u) => u.id === input.undertakingId);
    if (!record) throw new DomainError(404, 'Undertaking not found.');
    if (record.status !== 'Pending Verification' || record.version !== input.version) {
      throw new DomainError(
        409,
        'This submission is no longer awaiting verification. Refresh the record.',
      );
    }
    const decision = input.decision as 'Accepted/Verified' | 'Rejected';
    if (!['Accepted/Verified', 'Rejected'].includes(decision)) {
      throw new DomainError(422, 'Choose accept or reject.');
    }
    const reason =
      decision === 'Rejected'
        ? requireText(input.reason, 'Rejection reason')
        : text(input.reason);

    record.reviews.push({
      id: id(),
      decision,
      reason,
      reviewerId: actor.id,
      reviewer: actor.name,
      at,
      submissionId: record.submissions.at(-1)!.id,
    });
    record.status = decision;
    record.version++;

    audit(
      state,
      actor,
      `Undertaking ${decision} for student ${record.studentId} (${record.session})${
        reason ? `: ${reason}` : ''
      }`,
      record.id,
      at,
    );

    const studentRecipients = new Set([
      record.studentId,
      ...state.users.filter((u) => u.studentId === record.studentId).map((u) => u.id),
    ]);
    for (const recipient of studentRecipients) {
      notify(
        state,
        recipient,
        `Undertaking for session ${record.session}: ${decision}${reason ? ` — ${reason}` : ''}`,
        record.id,
        at,
      );
    }
    return record.id;
  }

  if (action === 'directory') {
    requireRole(actor, ['administrator']);
    const body = requireText(input.body, 'Body');
    if (!['Anti-Ragging Squad', 'Anti-Ragging Committee'].includes(body)) {
      throw new DomainError(422, 'Select a supported body.');
    }
    const userId = text(input.userId);
    if (
      userId &&
      !state.users.some(
        (u) =>
          u.id === userId &&
          u.role === (body === 'Anti-Ragging Squad' ? 'squad' : 'committee'),
      )
    ) {
      throw new DomainError(422, 'The linked account must have the matching role.');
    }
    const entry: DirectoryEntry = {
      id: text(input.id) || id(),
      body,
      userId,
      member: requireText(input.member, 'Member name'),
      designation: requireText(input.designation, 'Designation'),
      contact: requireText(input.contact, 'Contact'),
      active: input.active === true,
    };
    const index = state.directory.findIndex((d) => d.id === entry.id);
    if (index < 0) state.directory.push(entry);
    else state.directory[index] = entry;

    audit(
      state,
      actor,
      `${index < 0 ? 'Added' : 'Updated'} directory entry: ${entry.member} (${entry.body})`,
      entry.id,
      at,
    );
    return entry.id;
  }

  if (action === 'role') {
    requireRole(actor, ['administrator']);
    const user = state.users.find((u) => u.id === input.userId);
    const role = text(input.role) as Role;
    if (!user || !(role in roleLabels)) {
      throw new DomainError(422, 'Select an existing account and valid role.');
    }
    if (user.id === actor.id) {
      throw new DomainError(422, 'Use another administrator account to change your own access.');
    }
    const old = user.role;
    user.role = role;
    user.active = input.active === true;
    if (old !== role) {
      for (const entry of state.directory.filter((d) => d.userId === user.id)) {
        entry.active = false;
      }
    }
    audit(
      state,
      actor,
      `User account ${user.name}: ${old} -> ${role}; ${user.active ? 'active' : 'inactive'}`,
      user.id,
      at,
    );
    return user.id;
  }

  if (action === 'readNotification') {
    const notification = state.notifications.find(
      (n) => n.id === input.id && n.recipientId === actor.id,
    );
    if (!notification) throw new DomainError(404, 'Notification not found.');
    notification.read = true;
    return notification.id;
  }

  throw new DomainError(422, 'Unknown operation.');
}

export function generateDeadlineNotifications(state: State, now = new Date()) {
  const before = state.notifications.length;
  const at = now.toISOString();
  for (const record of state.cases) {
    const due = deadlineState(record, now);
    if (due !== 'Due soon' && due !== 'Overdue') continue;
    const recipients = [
      ...bodyMembers(state, record.assignedBody),
      ...state.users.filter((u) => u.active && isOversight(u)),
    ];
    for (const user of recipients) {
      notify(
        state,
        user.id,
        `${record.id}: ${due.toLowerCase()} (${record.dueDate}).`,
        record.id,
        at,
        `${record.id}:${record.dueDate}:${due}:${user.id}`,
      );
    }
  }
  return state.notifications.length !== before;
}

export function publicSnapshot(state: State, actor: User, revision: number): Snapshot {
  // Cases filtered by role permissions
  const cases = state.cases
    .filter((c) => canViewCase(actor, c))
    .map((c) => {
      // If student or parent, sanitize internal staff-only notes and hide evidence keys
      if (actor.role === 'student' || actor.role === 'parent') {
        return {
          ...c,
          evidence: [],
          people: '',
          history: c.history.map((h) => ({
            ...h,
            actorId: '',
            actor: '',
            note:
              h.from === h.to
                ? 'Case record updated.'
                : `Status changed from ${h.from} to ${h.to}.`,
          })),
        };
      }
      return {
        ...c,
        evidence: c.evidence.map((f) => ({ ...f, key: '' })),
      };
    });

  const studentId = actor.role === 'parent' ? actor.studentId : actor.id;
  const undertakings = state.undertakings
    .filter(
      (u) =>
        actor.role === 'administrator' ||
        isOversight(actor) ||
        actor.role === 'squad' ||
        actor.role === 'committee' ||
        (['student', 'parent'].includes(actor.role) && u.studentId === studentId),
    )
    .map((u) => ({
      ...u,
      submissions: u.submissions.map((s) => ({
        ...s,
        file: { ...s.file, key: '' },
      })),
    }));

  const visibleUserIds = new Set([
    actor.id,
    actor.studentId,
    ...cases.map((c) => c.reporterId),
    ...undertakings.map((u) => u.studentId),
  ]);

  return {
    user: actor,
    revision,
    serverTime: new Date().toISOString(),
    cases,
    undertakings,
    users:
      actor.role === 'administrator'
        ? state.users
        : state.users.filter((u) => visibleUserIds.has(u.id)),
    directory: state.directory.filter((d) => d.active || actor.role === 'administrator'),
    notifications: state.notifications.filter((n) => n.recipientId === actor.id),
    audit: isOversight(actor)
      ? state.audit
      : isHandler(actor)
        ? state.audit.filter((a) => cases.some((c) => c.id === a.targetId))
        : [],
    references: state.references,
  };
}

export function authorizedFile(state: State, actor: User, fileId: string): Attachment {
  for (const record of state.cases) {
    const file = record.evidence.find((f) => f.id === fileId);
    if (file) {
      if (canViewCase(actor, record) && (isHandler(actor) || isOversight(actor))) {
        return file;
      }
      throw new DomainError(403, 'Evidence file is restricted to authorized case handlers.');
    }
  }
  for (const record of state.undertakings) {
    const file = record.submissions.find((s) => s.file.id === fileId)?.file;
    if (file) {
      if (
        actor.role === 'administrator' ||
        isOversight(actor) ||
        actor.role === 'squad' ||
        actor.role === 'committee' ||
        (actor.role === 'student' && actor.id === record.studentId) ||
        (actor.role === 'parent' && actor.studentId === record.studentId)
      ) {
        return file;
      }
      throw new DomainError(403, 'Undertaking document is restricted to authorized personnel.');
    }
  }
  throw new DomainError(404, 'File not found or not available to this account.');
}
