export const roleLabels = {
  student: 'Student',
  parent: 'Parent / guardian',
  squad: 'Anti-Ragging Squad',
  committee: 'Anti-Ragging Committee',
  administrator: 'Administrator',
  oversight: 'Registrar / DoSA',
} as const;
export type Role = keyof typeof roleLabels;

export const statuses = [
  'Reported',
  'Acknowledged',
  'Under Investigation',
  'Findings Recorded',
  'Escalated to Committee',
  'Committee Decision Recorded',
  'Action Taken',
  'Closed',
] as const;
export type CaseStatus = (typeof statuses)[number];

export const categories = [
  'Verbal harassment',
  'Physical intimidation',
  'Online harassment',
  'Other ragging-related incident',
] as const;
export type Category = (typeof categories)[number];

export type Body = 'Anti-Ragging Squad' | 'Anti-Ragging Committee' | 'Administrator review';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  studentId?: string;
};

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  key?: string;
  uploadedBy: string;
  uploadedAt: string;
};

export type History = {
  id: string;
  from: CaseStatus;
  to: CaseStatus;
  note: string;
  actorId: string;
  actor: string;
  at: string;
};

export type CaseRecord = {
  id: string;
  reporterId: string | null;
  reportMode: 'named' | 'anonymous';
  category: string;
  description: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  people: string;
  status: CaseStatus;
  initialBody: Body;
  assignedBody: Body;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  evidence: Attachment[];
  history: History[];
};

export type Review = {
  id: string;
  decision: 'Accepted/Verified' | 'Rejected';
  reason: string;
  reviewerId: string;
  reviewer: string;
  at: string;
  submissionId: string;
};

export type Undertaking = {
  id: string;
  studentId: string;
  session: string;
  guardianName: string;
  status: 'Pending Verification' | 'Accepted/Verified' | 'Rejected';
  version: number;
  submissions: {
    id: string;
    file: Attachment;
    submittedBy: string;
    at: string;
  }[];
  reviews: Review[];
};

export type DirectoryEntry = {
  id: string;
  userId: string;
  body: string;
  member: string;
  designation: string;
  contact: string;
  active: boolean;
};

export type Audit = {
  id: string;
  actorId: string;
  actor: string;
  action: string;
  targetId: string;
  at: string;
  details?: string;
};

export type Notification = {
  id: string;
  recipientId: string;
  message: string;
  targetId: string;
  at: string;
  read: boolean;
  key?: string;
};

export type Reference = {
  id: string;
  level: string;
  category: string;
  action: string;
  fine: string;
  source: string;
  effectiveDate: string;
};

export type State = {
  users: User[];
  cases: CaseRecord[];
  undertakings: Undertaking[];
  directory: DirectoryEntry[];
  audit: Audit[];
  notifications: Notification[];
  references: Reference[];
  requests: { key: string; userId: string; resultId: string }[];
};

export type Snapshot = Omit<State, 'requests'> & {
  user: User;
  revision: number;
  serverTime: string;
};

export const isHandler = (user: User) => user.role === 'squad' || user.role === 'committee';
export const isOversight = (user: User) => user.role === 'administrator' || user.role === 'oversight';

export function canViewCase(user: User, record: CaseRecord): boolean {
  if (isOversight(user)) return true;
  if (user.role === 'student') return record.reporterId === user.id;
  if (user.role === 'parent') return Boolean(user.studentId && record.reporterId === user.studentId);
  if (user.role === 'squad') return record.assignedBody === 'Anti-Ragging Squad';
  if (user.role === 'committee') return record.assignedBody === 'Anti-Ragging Committee';
  return false;
}

export function nextStatus(user: User, record: CaseRecord): CaseStatus | null {
  if (!isHandler(user) || !canViewCase(user, record) || record.status === 'Closed') {
    return null;
  }

  // Squad Member Transitions
  if (user.role === 'squad' && record.assignedBody === 'Anti-Ragging Squad') {
    if (record.status === 'Acknowledged') return 'Under Investigation';
    if (record.status === 'Under Investigation') return 'Findings Recorded';
    if (record.status === 'Findings Recorded') return 'Escalated to Committee';
    return null;
  }

  // Committee Member Transitions
  if (user.role === 'committee' && record.assignedBody === 'Anti-Ragging Committee') {
    // If case is directly assigned to Committee (e.g. Online harassment)
    if (record.status === 'Acknowledged') return 'Under Investigation';
    if (record.status === 'Under Investigation') return 'Findings Recorded';
    if (record.status === 'Findings Recorded') return 'Committee Decision Recorded';
    // If escalated from Squad
    if (record.status === 'Escalated to Committee') return 'Committee Decision Recorded';
    if (record.status === 'Committee Decision Recorded') return 'Action Taken';
    if (record.status === 'Action Taken') return 'Closed';
    return null;
  }

  return null;
}

export function deadlineState(
  record: CaseRecord,
  now = new Date(),
): 'Closed' | 'Not set' | 'Overdue' | 'Due soon' | 'On track' {
  if (record.status === 'Closed') return 'Closed';
  if (!record.dueDate) return 'Not set';
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const days = Math.round(
    (Date.parse(`${record.dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
  );
  return days < 0 ? 'Overdue' : days <= 2 ? 'Due soon' : 'On track';
}
