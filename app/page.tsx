'use client';

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  code?: string;
  caseId?: string;
  fileId?: string;
  undertakingId?: string;
  snapshot?: Snapshot;
  token?: string;
};

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Gavel,
  History as HistoryIcon,
  Landmark,
  LogOut,
  MailCheck,
  Menu,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type SyntheticEvent,
  useEffect,
  useState,
} from 'react';
import type {
  CaseRecord,
  CaseStatus,
  DirectoryEntry,
  Role,
  Snapshot,
  User,
} from '@/lib/arms/model';
import {
  categories,
  anonymousReporter,
  canReviewUndertaking,
  deadlineState,
  nextStatus,
  roleLabels,
} from '@/lib/arms/model';

type View =
  | 'overview'
  | 'report'
  | 'cases'
  | 'undertaking'
  | 'directory'
  | 'reports'
  | 'audit'
  | 'users'
  | 'reference';

const DEMO_ACCOUNTS: {
  id: string;
  name: string;
  role: Role;
  email: string;
  label: string;
}[] = [
  {
    id: 'somik',
    name: 'Somik Jain',
    role: 'student',
    email: 'somik@arms.test',
    label: 'Student (Somik Jain)',
  },
  {
    id: 'aman',
    name: 'Aman Verma',
    role: 'student',
    email: 'aman@arms.test',
    label: 'Student (Aman Verma)',
  },
  {
    id: 'guardian',
    name: 'Demo Guardian',
    role: 'parent',
    email: 'guardian@arms.test',
    label: 'Parent / Guardian',
  },
  {
    id: 'squad',
    name: 'Dr. A. Sharma',
    role: 'squad',
    email: 'squad@arms.test',
    label: 'Anti-Ragging Squad',
  },
  {
    id: 'squad2',
    name: 'Mr. R. Meena',
    role: 'squad',
    email: 'squad2@arms.test',
    label: 'Squad (Mr. R. Meena)',
  },
  {
    id: 'committee',
    name: 'Dr. S. Kapoor',
    role: 'committee',
    email: 'committee@arms.test',
    label: 'Anti-Ragging Committee Chair',
  },
  {
    id: 'committee2',
    name: 'Ms. P. Nair',
    role: 'committee',
    email: 'committee2@arms.test',
    label: 'Committee (Ms. P. Nair)',
  },
  {
    id: 'admin',
    name: 'College Administrator',
    role: 'administrator',
    email: 'admin@arms.test',
    label: 'College Administrator',
  },
  {
    id: 'oversight',
    name: 'Dr. Registrar / DoSA',
    role: 'oversight',
    email: 'oversight@arms.test',
    label: 'Registrar / DoSA (Oversight)',
  },
];

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let tone = 'neutral';
  if (
    normalized.includes('closed') ||
    normalized.includes('accepted') ||
    normalized.includes('verified') ||
    normalized === 'active'
  ) {
    tone = 'green';
  } else if (
    normalized.includes('under investigation') ||
    normalized.includes('acknowledged') ||
    normalized.includes('findings')
  ) {
    tone = 'blue';
  } else if (
    normalized.includes('escalated') ||
    normalized.includes('decision') ||
    normalized.includes('pending')
  ) {
    tone = 'amber';
  } else if (
    normalized.includes('rejected') ||
    normalized.includes('overdue')
  ) {
    tone = 'red';
  }
  return <span className={`status-pill ${tone}`}>{status}</span>;
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const token = sessionStorage.getItem('arms_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function ARMSApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notice, setNotice] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Sign In State
  const [loginEmail, setLoginEmail] = useState('somik@arms.test');
  const [loginPassword, setLoginPassword] = useState('ArmsDemo2026!');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Report Submission State
  const [reportMode, setReportMode] = useState<'named' | 'anonymous'>('named');
  const [reportCategory, setReportCategory] = useState<string>(
    'Physical intimidation',
  );
  const [reportDesc, setReportDesc] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportTime, setReportTime] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportPeople, setReportPeople] = useState('');
  const [reportEvidenceFile, setReportEvidenceFile] = useState<File | null>(
    null,
  );
  const [reportConfirmed, setReportConfirmed] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportRequestKey, setReportRequestKey] = useState<string>('');
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // Case Workspace State
  const [selectedCaseId, setSelectedCaseId] =
    useState<string>('ARMS-2026-0142');
  const [caseSearch, setCaseSearch] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState<
    'all' | 'active' | 'closed'
  >('all');
  const [actionNote, setActionNote] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [handlerActionSubmitting, setHandlerActionSubmitting] = useState(false);

  // Additional Evidence State
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);

  // Edit Case Details State (Category / Deadline)
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDetailsNote, setEditDetailsNote] = useState('');

  // Reassign State
  const [reassignBody, setReassignBody] = useState<
    'Anti-Ragging Squad' | 'Anti-Ragging Committee'
  >('Anti-Ragging Squad');
  const [reassignNote, setReassignNote] = useState('');

  // Undertaking State
  const [undertakingSession, setUndertakingSession] = useState('2026-27');
  const [undertakingGuardian, setUndertakingGuardian] = useState('');
  const [undertakingFile, setUndertakingFile] = useState<File | null>(null);
  const [undertakingConfirmed, setUndertakingConfirmed] = useState(false);
  const [undertakingSubmitting, setUndertakingSubmitting] = useState(false);
  const [selectedUndertakingId, setSelectedUndertakingId] =
    useState<string>('');
  const [undertakingFilter, setUndertakingFilter] = useState<
    'all' | 'Pending Verification' | 'Accepted/Verified' | 'Rejected'
  >('all');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Directory Admin State
  const [showAddDirModal, setShowAddDirModal] = useState(false);
  const [newDirMember, setNewDirMember] = useState('');
  const [newDirBody, setNewDirBody] = useState('Anti-Ragging Squad');
  const [newDirUserId] = useState('');
  const [newDirDesignation, setNewDirDesignation] = useState('');
  const [newDirContact, setNewDirContact] = useState('');

  // User Admin State
  const [selectedUserRole, setSelectedUserRole] = useState<
    Record<string, Role>
  >({});

  const currentUser = snapshot?.user ?? null;
  const cases = snapshot?.cases ?? [];
  const undertakings = snapshot?.undertakings ?? [];
  const directory = snapshot?.directory ?? [];
  const notifications = snapshot?.notifications ?? [];
  const auditLogs = snapshot?.audit ?? [];
  const references = snapshot?.references ?? [];

  async function loadSnapshot() {
    try {
      const res = await fetch('/api/arms/snapshot', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        setSnapshot(null);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as ApiResponse;
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
      } else {
        setSnapshot(null);
      }
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch('/api/arms/snapshot', { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        const data = raw as ApiResponse | null;
        if (!active) return;
        if (data?.ok && data.snapshot) {
          setSnapshot(data.snapshot);
        } else {
          setSnapshot(null);
        }
      })
      .catch(() => {
        if (active) setSnapshot(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Selected case and undertaking derived via find with fallback

  // The public form has no login session or access to protected records.
  function startAnonymousReport() {
    setSnapshot({
      user: anonymousReporter,
      revision: 0,
      serverTime: new Date().toISOString(),
      cases: [],
      undertakings: [],
      users: [],
      directory: [],
      notifications: [],
      audit: [],
      references: [],
    });
    setReportMode('anonymous');
    setView('report');
    setNotice(null);
  }

  async function handleLogin(e?: SyntheticEvent, demoId?: string) {
    if (e) e.preventDefault();
    setLoginSubmitting(true);
    setNotice(null);
    try {
      const payload = demoId
        ? { demoUserId: demoId }
        : { email: loginEmail, password: loginPassword };
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) {
        setNotice({
          message: data.error || 'Failed to sign in.',
          type: 'error',
        });
        return;
      }
      if (data.token && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('arms_token', data.token);
        } catch {}
      }
      setNotice({
        message: data.message || 'Operation succeeded.',
        type: 'success',
      });
      setView('overview');
      await loadSnapshot();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setNotice({
        message: errMsg || 'Network error during sign in.',
        type: 'error',
      });
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('arms_token');
        } catch {}
      }
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      setSnapshot(null);
      setView('overview');
      setNotice({ message: 'Signed out successfully.', type: 'info' });
    }
  }

  async function sendActionToServer(
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      // Use the named endpoints shown in the interface design.
      let endpoint = '/api/arms/command';
      if (payload.action === 'status')
        endpoint = `/api/cases/${payload.caseId}/status`;
      if (payload.action === 'reopen')
        endpoint = `/api/cases/${payload.caseId}/reopen`;
      if (payload.action === 'review')
        endpoint = `/api/undertakings/${payload.undertakingId}/reviews`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) {
        setNotice({
          message: data.error || 'Operation failed.',
          type: 'error',
        });
        return false;
      }
      if (data.snapshot) setSnapshot(data.snapshot);
      setNotice({ message: 'Saved successfully.', type: 'success' });
      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setNotice({ message: errMsg, type: 'error' });
      return false;
    }
  }

  // UC-003 Report Submission
  async function submitReport(e: SyntheticEvent) {
    e.preventDefault();
    if (!reportConfirmed) {
      setNotice({
        message: 'Please confirm the declaration check.',
        type: 'error',
      });
      return;
    }
    setReportSubmitting(true);
    setNotice(null);
    try {
      const activeKey =
        reportRequestKey ||
        `req-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      if (!reportRequestKey) setReportRequestKey(activeKey);
      const formData = new FormData();
      formData.append('requestKey', activeKey);
      formData.append('category', reportCategory);
      formData.append('description', reportDesc);
      formData.append('incidentDate', reportDate);
      formData.append('incidentTime', reportTime);
      formData.append('location', reportLocation);
      formData.append('people', reportPeople);
      formData.append('mode', reportMode);
      formData.append('confirmed', 'true');
      if (reportEvidenceFile) {
        formData.append('evidence', reportEvidenceFile);
      }

      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) {
        setNotice({
          message: data.error || 'Submission failed.',
          type: 'error',
        });
        return;
      }
      setCreatedCaseId(data.caseId ?? null);
      if (data.snapshot) setSnapshot(data.snapshot);
      setNotice({
        message: `Case ${data.caseId} filed successfully. Status: Acknowledged.`,
        type: 'success',
      });
      // Clear form
      setReportDesc('');
      setReportDate('');
      setReportTime('');
      setReportLocation('');
      setReportPeople('');
      setReportEvidenceFile(null);
      setReportConfirmed(false);
      setReportRequestKey('');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setNotice({ message: errMsg || 'Submission failed.', type: 'error' });
    } finally {
      setReportSubmitting(false);
    }
  }

  // UC-007 Status Update
  async function handleStatusTransition(targetStatus: CaseStatus) {
    if (!actionNote.trim()) {
      setNotice({
        message: 'A finding, observation or action note is required.',
        type: 'error',
      });
      return;
    }
    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase) return;

    setHandlerActionSubmitting(true);
    const ok = await sendActionToServer({
      action: 'status',
      caseId: currentCase.id,
      version: currentCase.version,
      nextStatus: targetStatus,
      note: actionNote.trim(),
    });
    setHandlerActionSubmitting(false);
    if (ok) {
      setActionNote('');
      setNotice({
        message: `${currentCase.id} updated to ${targetStatus}.`,
        type: 'success',
      });
    }
  }

  // Reopen Case
  async function handleReopenCase() {
    if (!reopenNote.trim()) {
      setNotice({ message: 'A reopening reason is mandatory.', type: 'error' });
      return;
    }
    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase) return;

    setHandlerActionSubmitting(true);
    const ok = await sendActionToServer({
      action: 'reopen',
      caseId: currentCase.id,
      version: currentCase.version,
      note: reopenNote.trim(),
    });
    setHandlerActionSubmitting(false);
    if (ok) {
      setReopenNote('');
      setNotice({
        message: `${currentCase.id} reopened: Under Investigation.`,
        type: 'success',
      });
    }
  }

  // Attach Additional Evidence
  async function handleAttachEvidence(e: SyntheticEvent) {
    e.preventDefault();
    if (!evidenceFile) {
      setNotice({
        message: 'Select an evidence file (PDF, PNG, JPG).',
        type: 'error',
      });
      return;
    }
    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase) return;

    setEvidenceSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', evidenceFile);
      formData.append('note', evidenceNote);
      formData.append('version', currentCase.version.toString());

      const res = await fetch(`/api/cases/${currentCase.id}/evidence`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) {
        setNotice({
          message: data.error || 'Failed to attach evidence.',
          type: 'error',
        });
        return;
      }
      if (data.snapshot) setSnapshot(data.snapshot);
      setEvidenceFile(null);
      setEvidenceNote('');
      setNotice({
        message: 'Additional evidence attached successfully.',
        type: 'success',
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setNotice({ message: errMsg, type: 'error' });
    } finally {
      setEvidenceSubmitting(false);
    }
  }

  // Update Case Details
  async function handleUpdateCaseDetails() {
    if (!editDetailsNote.trim()) {
      setNotice({
        message: 'Please provide a reason for editing case details.',
        type: 'error',
      });
      return;
    }
    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase) return;

    const ok = await sendActionToServer({
      action: 'caseDetails',
      caseId: currentCase.id,
      version: currentCase.version,
      category: editCategory || currentCase.category,
      dueDate: editDueDate || currentCase.dueDate,
      note: editDetailsNote.trim(),
    });
    if (ok) {
      setEditDetailsNote('');
      setNotice({
        message: 'Case category / due date updated.',
        type: 'success',
      });
    }
  }

  // Reassign Case
  async function handleReassignCase() {
    if (!reassignNote.trim()) {
      setNotice({
        message: 'Please provide a reassignment reason.',
        type: 'error',
      });
      return;
    }
    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase) return;

    const ok = await sendActionToServer({
      action: 'assign',
      caseId: currentCase.id,
      version: currentCase.version,
      body: reassignBody,
      note: reassignNote.trim(),
    });
    if (ok) {
      setReassignNote('');
      setNotice({
        message: `${currentCase.id} assigned to ${reassignBody}.`,
        type: 'success',
      });
    }
  }

  // UC-011 Undertaking Submission
  async function submitUndertaking(e: SyntheticEvent) {
    e.preventDefault();
    if (!undertakingFile) {
      setNotice({
        message: 'Upload a signed undertaking PDF document.',
        type: 'error',
      });
      return;
    }
    if (!undertakingConfirmed) {
      setNotice({
        message: 'Confirm the declaration checkbox before submitting.',
        type: 'error',
      });
      return;
    }

    setUndertakingSubmitting(true);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.append('pdf', undertakingFile);
      formData.append('session', undertakingSession);
      formData.append('guardianName', undertakingGuardian);
      formData.append('confirmed', 'true');

      // If resubmitting a rejected record
      const studentId =
        currentUser?.role === 'parent'
          ? currentUser.studentId
          : currentUser?.id;
      const existing = undertakings.find(
        (u) => u.studentId === studentId && u.session === undertakingSession,
      );
      if (existing) {
        formData.append('version', existing.version.toString());
      }

      const res = await fetch('/api/undertakings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) {
        setNotice({
          message: data.error || 'Undertaking submission failed.',
          type: 'error',
        });
        return;
      }
      if (data.snapshot) setSnapshot(data.snapshot);
      setUndertakingFile(null);
      setUndertakingConfirmed(false);
      setNotice({
        message: 'Signed undertaking submitted for administrator verification.',
        type: 'success',
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred.';
      setNotice({ message: errMsg, type: 'error' });
    } finally {
      setUndertakingSubmitting(false);
    }
  }

  // Administrator Undertaking Review
  async function reviewUndertaking(decision: 'Accepted/Verified' | 'Rejected') {
    const currentUt = undertakings.find((u) => u.id === selectedUndertakingId);
    if (!currentUt) return;
    if (decision === 'Rejected' && !rejectionReason.trim()) {
      setNotice({
        message: 'A rejection reason is mandatory when rejecting.',
        type: 'error',
      });
      return;
    }

    setReviewSubmitting(true);
    const ok = await sendActionToServer({
      action: 'review',
      undertakingId: currentUt.id,
      version: currentUt.version,
      decision,
      reason: rejectionReason.trim(),
    });
    setReviewSubmitting(false);
    if (ok) {
      setRejectionReason('');
      setNotice({
        message: `Undertaking marked as ${decision}.`,
        type: 'success',
      });
    }
  }

  // Directory Management
  async function handleAddDirectoryEntry(e: SyntheticEvent) {
    e.preventDefault();
    if (
      !newDirMember.trim() ||
      !newDirDesignation.trim() ||
      !newDirContact.trim()
    ) {
      setNotice({
        message: 'All directory fields are required.',
        type: 'error',
      });
      return;
    }
    const ok = await sendActionToServer({
      action: 'directory',
      member: newDirMember.trim(),
      body: newDirBody,
      userId: newDirUserId,
      designation: newDirDesignation.trim(),
      contact: newDirContact.trim(),
      active: true,
    });
    if (ok) {
      setShowAddDirModal(false);
      setNewDirMember('');
      setNewDirDesignation('');
      setNewDirContact('');
      setNotice({ message: 'Directory entry created.', type: 'success' });
    }
  }

  async function handleToggleDirectoryActive(entry: DirectoryEntry) {
    const ok = await sendActionToServer({
      action: 'directory',
      id: entry.id,
      member: entry.member,
      body: entry.body,
      userId: entry.userId,
      designation: entry.designation,
      contact: entry.contact,
      active: !entry.active,
    });
    if (ok) {
      setNotice({
        message: `Directory entry ${entry.active ? 'deactivated' : 'activated'}.`,
        type: 'success',
      });
    }
  }

  // User Administration
  async function handleRoleChange(user: User, newRole: Role) {
    const ok = await sendActionToServer({
      action: 'role',
      userId: user.id,
      role: newRole,
      active: user.active,
    });
    if (ok) {
      setNotice({
        message: `Role updated for ${user.name} to ${newRole}.`,
        type: 'success',
      });
    }
  }

  async function handleToggleUserActive(user: User) {
    const ok = await sendActionToServer({
      action: 'role',
      userId: user.id,
      role: user.role,
      active: !user.active,
    });
    if (ok) {
      setNotice({
        message: `Account for ${user.name} set to ${!user.active ? 'active' : 'inactive'}.`,
        type: 'success',
      });
    }
  }

  async function handleReadNotification(id: string) {
    await sendActionToServer({ action: 'readNotification', id });
  }

  // Filtered Cases
  const selectedCase = cases.find((c) => c.id === selectedCaseId) ?? cases[0];
  function getFilteredCases() {
    let list = cases;
    if (caseStatusFilter === 'active') {
      list = list.filter((c) => c.status !== 'Closed');
    } else if (caseStatusFilter === 'closed') {
      list = list.filter((c) => c.status === 'Closed');
    }
    const searchText = caseSearch.trim().toLowerCase();
    if (searchText) {
      list = list.filter((c) =>
        `${c.id} ${c.category} ${c.status} ${c.assignedBody} ${c.description}`
          .toLowerCase()
          .includes(searchText),
      );
    }
    return list;
  }
  const visibleCases = getFilteredCases();

  // Scoped Dashboard Metrics (independent of search filters!)
  const totalCasesCount = cases.length;
  const activeCasesCount = cases.filter((c) => c.status !== 'Closed').length;
  const closedCasesCount = cases.filter((c) => c.status === 'Closed').length;
  const overdueCasesCount = cases.filter(
    (c) => deadlineState(c) === 'Overdue',
  ).length;
  const dueSoonCasesCount = cases.filter(
    (c) => deadlineState(c) === 'Due soon',
  ).length;

  // Selected Undertaking
  const selectedUndertaking =
    undertakings.find((u) => u.id === selectedUndertakingId) ?? undertakings[0];
  function getFilteredUndertakings() {
    if (undertakingFilter === 'all') return undertakings;
    return undertakings.filter((u) => u.status === undertakingFilter);
  }
  const visibleUndertakings = getFilteredUndertakings();

  const activeDirectoryCount = directory.filter((d) => d.active).length;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <main className="sign-in-page">
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <ShieldCheck
            size={40}
            style={{
              margin: '0 auto 1rem',
              display: 'block',
              color: '#2563eb',
            }}
          />
          <h2>Loading Anti-Ragging Monitoring System...</h2>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="sign-in-page">
        <section className="sign-in-card" style={{ maxWidth: '44rem' }}>
          <div className="brand-mark">
            <ShieldCheck size={28} />
          </div>
          <p className="eyebrow">ARMS Prototype · CS314 Viva</p>
          <h1>Sign in to ARMS</h1>
          <p>
            Authenticate with local demonstration credentials to test role-based
            access, case reporting, handler investigations, and undertaking
            verification.
          </p>

          <div className="prototype-banner" style={{ margin: '1rem 0' }}>
            <ShieldCheck size={18} />
            <span>
              <strong>Demonstration Authentication:</strong> Local demonstration
              accounts for the lab evaluation. Institutional SSO / LDAP is
              simulated for this prototype.
            </span>
          </div>

          {notice && (
            <div
              className={`toast ${notice.type === 'error' ? 'toast-error' : ''}`}
              style={{ marginBottom: '1rem' }}
            >
              <span>{notice.message}</span>
              <button onClick={() => setNotice(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          <button
            className="secondary-button"
            type="button"
            onClick={startAnonymousReport}
          >
            Submit an anonymous report without signing in
          </button>

          <form
            onSubmit={(e) => handleLogin(e)}
            style={{ marginBottom: '1.5rem' }}
          >
            <label>
              <span>Institutional Email</span>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="user@arms.test"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={loginSubmitting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loginSubmitting ? 'Authenticating...' : 'Sign in'}{' '}
              <ArrowRight size={17} />
            </button>
          </form>

          <div
            style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '0.75rem',
              }}
            >
              Quick Demo Sign-In (One-Click Viva Login):
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.5rem',
              }}
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => void handleLogin(undefined, acc.id)}
                  disabled={loginSubmitting}
                  style={{
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = '#2563eb')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = '#cbd5e1')
                  }
                >
                  <strong style={{ display: 'block', color: '#1e293b' }}>
                    {acc.name}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {roleLabels[acc.role]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  // The earlier sign-in return guarantees a user exists here.
  const signedInUser = currentUser;
  // Logged In Application Shell
  const role = signedInUser.role;
  const isCaseHandler = role === 'squad' || role === 'committee';
  const isAdmin = role === 'administrator';
  const isOversightUser = role === 'administrator' || role === 'oversight';
  const canReport = role === 'student';
  // Roles that can verify/review undertakings
  const canVerify = canReviewUndertaking(signedInUser);
  // Only students and parents can submit undertakings
  const canSubmitUndertaking = role === 'student' || role === 'parent';

  const navigationItems =
    signedInUser.id === 'anonymous'
      ? [{ id: 'report' as View, label: 'Report incident', icon: FileText }]
      : [
          { id: 'overview' as View, label: 'Overview', icon: BarChart3 },
          ...(canReport
            ? [
                {
                  id: 'report' as View,
                  label: 'Report incident',
                  icon: FileText,
                },
              ]
            : []),
          { id: 'cases' as View, label: 'Cases', icon: ShieldAlert },
          ...(canVerify || canSubmitUndertaking
            ? [
                {
                  id: 'undertaking' as View,
                  label: canVerify ? 'Undertakings (Verify)' : 'Undertaking',
                  icon: CheckCircle2,
                },
              ]
            : []),
          { id: 'directory' as View, label: 'Directory', icon: Users },
          ...(isAdmin || isOversightUser || role === 'committee'
            ? [{ id: 'reports' as View, label: 'Case reports', icon: Download }]
            : []),
          ...(isAdmin || isOversightUser
            ? [{ id: 'audit' as View, label: 'Audit log', icon: HistoryIcon }]
            : []),
          ...(isAdmin
            ? [{ id: 'users' as View, label: 'User accounts', icon: UserCog }]
            : []),
          {
            id: 'reference' as View,
            label: 'Punishment reference',
            icon: BookOpen,
          },
        ];

  // Screen markup; the form handlers above perform the actual API calls.
  function renderOverviewScreen() {
    return (
      <>
        <section className="welcome-row">
          <SectionTitle
            eyebrow="Dashboard"
            title={`Welcome, ${signedInUser.name}`}
            description={
              isAdmin
                ? 'Administrative control center: manage users, directory roster, and monitor campus-wide case compliance.'
                : isOversightUser
                  ? 'Institutional oversight: review compliance metrics, case progress, and disciplinary timelines.'
                  : isCaseHandler
                    ? 'Case workspace: examine assigned reports, record investigative findings, and update case lifecycle.'
                    : role === 'parent'
                      ? `Parent/Guardian workspace: manage undertaking verification for ${signedInUser.studentId || 'linked student'}.`
                      : 'Student portal: file confidential reports, monitor complaint status, and submit anti-ragging undertakings.'
            }
          />
          <button
            className="primary-button"
            onClick={() => setView(canReport ? 'report' : 'cases')}
          >
            {canReport ? 'Report an incident' : 'Review cases'}{' '}
            <ChevronRight size={18} />
          </button>
        </section>

        {/* Metrics Grid */}
        <section className="metric-grid" aria-label="Case summary">
          <article>
            <div className="metric-icon blue">
              <FileText />
            </div>
            <div>
              <span>
                {role === 'student'
                  ? 'My Submitted Reports'
                  : isCaseHandler
                    ? 'Assigned Cases'
                    : 'Total Cases'}
              </span>
              <strong>{totalCasesCount}</strong>
              <small>Active prototype store</small>
            </div>
          </article>

          <article>
            <div className="metric-icon amber">
              <Clock3 />
            </div>
            <div>
              <span>Active Cases</span>
              <strong>{activeCasesCount}</strong>
              <small>{closedCasesCount} closed cases</small>
            </div>
          </article>

          <article>
            <div className="metric-icon red">
              <AlertTriangle />
            </div>
            <div>
              <span>Overdue / Approaching</span>
              <strong>{overdueCasesCount + dueSoonCasesCount}</strong>
              <small>
                {overdueCasesCount} overdue, {dueSoonCasesCount} due soon
              </small>
            </div>
          </article>

          <article>
            <div className="metric-icon green">
              <CheckCircle2 />
            </div>
            <div>
              <span>
                {canVerify
                  ? 'Pending Undertakings'
                  : 'Active Directory Members'}
              </span>
              <strong>
                {canVerify
                  ? undertakings.filter(
                      (u) => u.status === 'Pending Verification',
                    ).length
                  : activeDirectoryCount}
              </strong>
              <small>
                {canVerify
                  ? `${undertakings.length} total undertakings`
                  : 'Anti-Ragging Squad & Committee'}
              </small>
            </div>
          </article>
        </section>

        {/* Recent Cases Preview */}
        <section className="panel" style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h2>Recent Cases</h2>
            <button
              className="secondary-button"
              onClick={() => setView('cases')}
            >
              View all cases
            </button>
          </div>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {cases.slice(0, 4).map((c) => (
              <button
                key={c.id}
                type="button"
                style={{
                  padding: '0.85rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: '#fff',
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={() => {
                  setSelectedCaseId(c.id);
                  setView('cases');
                }}
              >
                <div>
                  <strong>{c.id}</strong> ·{' '}
                  <span style={{ color: '#64748b' }}>{c.category}</span>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.85rem',
                      color: '#334155',
                    }}
                  >
                    {c.description.slice(0, 100)}...
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    alignItems: 'center',
                  }}
                >
                  <StatusPill status={c.status} />
                  <ChevronRight size={16} color="#94a3b8" />
                </div>
              </button>
            ))}
            {cases.length === 0 && (
              <p style={{ color: '#64748b' }}>
                No cases accessible to this account.
              </p>
            )}
          </div>
        </section>
      </>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderReportScreen() {
    return (
      <section className="report-layout">
        <div>
          <SectionTitle
            eyebrow="UC-003"
            title="Submit a Ragging Complaint"
            description="Submit an incident report. You may report under your authenticated student name or anonymously. Incident date, time and location are optional if unknown."
          />

          {createdCaseId ? (
            <div className="success-card" style={{ marginTop: '1.5rem' }}>
              <CheckCircle2 size={36} color="#10b981" />
              <h2>Report Successfully Filed</h2>
              <p>
                Your complaint has been assigned Case ID:{' '}
                <strong>{createdCaseId}</strong>. Initial status is{' '}
                <strong>Acknowledged</strong>.
              </p>
              <p>
                Relevant authorized handlers have been notified to commence
                inquiry.
              </p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  className="primary-button"
                  onClick={() => {
                    setSelectedCaseId(createdCaseId);
                    setView('cases');
                    setCreatedCaseId(null);
                  }}
                >
                  Track Case in Workspace <ChevronRight size={17} />
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setCreatedCaseId(null)}
                >
                  File Another Report
                </button>
              </div>
            </div>
          ) : (
            <form
              className="form-panel"
              onSubmit={submitReport}
              style={{ marginTop: '1.5rem' }}
            >
              {/* Reporter Mode Toggle */}
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <button
                  type="button"
                  className={
                    reportMode === 'named'
                      ? 'primary-button'
                      : 'secondary-button'
                  }
                  onClick={() => setReportMode('named')}
                  disabled={signedInUser.id === 'anonymous'}
                >
                  Named Report ({signedInUser.name})
                </button>
                <button
                  type="button"
                  className={
                    reportMode === 'anonymous'
                      ? 'primary-button'
                      : 'secondary-button'
                  }
                  onClick={() => setReportMode('anonymous')}
                >
                  Anonymous Report
                </button>
              </div>

              <div
                className="identity-card"
                style={{ marginBottom: '1.25rem' }}
              >
                <UserRound />
                <div>
                  <span>Reporting Mode:</span>
                  <strong>
                    {reportMode === 'named'
                      ? `${signedInUser.name} (Student · ${signedInUser.email})`
                      : 'Confidential / Anonymous Report (Reporter identity is withheld from handlers and audit logs)'}
                  </strong>
                  {reportMode === 'anonymous' && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#64748b',
                        marginTop: '0.35rem',
                      }}
                    >
                      Anonymous reports do not store a reporter identity. No
                      sign-in is required when using the public form; anonymous
                      reports have limited follow-up.
                    </div>
                  )}
                </div>
              </div>

              {/* Category Selection */}
              <label>
                <span>Incident Category *</span>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}{' '}
                      {cat === 'Online harassment'
                        ? '→ Committee'
                        : cat === 'Other ragging-related incident'
                          ? '→ Administrator review'
                          : '→ Squad'}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#64748b' }}>
                  Category-based routing: Online harassment assigns to
                  Committee; verbal and physical incidents go to Squad; other
                  incidents go to administrator review. If no active linked
                  member exists, administrator review is used.
                </small>
              </label>

              {/* Description */}
              <label>
                <span>Incident Description *</span>
                <textarea
                  rows={4}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Describe what occurred, who was affected, and any surrounding context..."
                  required
                />
              </label>

              {/* Optional Details Collapsible/Section */}
              <fieldset
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  margin: '1rem 0',
                }}
              >
                <legend
                  style={{
                    fontWeight: 600,
                    color: '#334155',
                    padding: '0 0.5rem',
                  }}
                >
                  Optional Incident Details (Fill if known)
                </legend>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                  }}
                >
                  <label>
                    <span>Incident Date (if known)</span>
                    <input
                      type="date"
                      value={reportDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setReportDate(e.target.value)}
                    />
                  </label>
                  <label>
                    <span>Incident Time (if known)</span>
                    <input
                      type="time"
                      value={reportTime}
                      onChange={(e) => setReportTime(e.target.value)}
                    />
                  </label>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '0.75rem',
                  }}
                >
                  <label>
                    <span>Location (if known)</span>
                    <input
                      type="text"
                      value={reportLocation}
                      onChange={(e) => setReportLocation(e.target.value)}
                      placeholder="e.g. Hostel 3, Academic Block ground floor"
                    />
                  </label>
                  <label>
                    <span>Involved Persons (if known)</span>
                    <input
                      type="text"
                      value={reportPeople}
                      onChange={(e) => setReportPeople(e.target.value)}
                      placeholder="Names, branch or identifiers if recognized"
                    />
                  </label>
                </div>
              </fieldset>

              {/* Evidence Attachment with Remove Option */}
              <div style={{ margin: '1rem 0' }}>
                <label
                  className="upload-box"
                  style={{ cursor: 'pointer', display: 'block' }}
                >
                  <Upload size={24} />
                  <span>
                    <strong>Attach Evidence (Optional)</strong>
                    <small>
                      PDF, PNG or JPG up to 10 MB. Server verifies actual magic
                      bytes.
                    </small>
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (e.target.files && e.target.files[0]) {
                        setReportEvidenceFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {reportEvidenceFile && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.6rem 0.8rem',
                      background: '#f1f5f9',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: '#1e293b' }}>
                      <Paperclip
                        size={15}
                        style={{ display: 'inline', marginRight: 4 }}
                      />
                      {reportEvidenceFile.name} (
                      {(reportEvidenceFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => setReportEvidenceFile(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.8rem',
                      }}
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Declaration */}
              <label className="check-row" style={{ margin: '1rem 0' }}>
                <input
                  type="checkbox"
                  checked={reportConfirmed}
                  onChange={(e) => setReportConfirmed(e.target.checked)}
                  required
                />
                <span>
                  I declare that the information provided is truthful to the
                  best of my knowledge.
                </span>
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setView('overview')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}{' '}
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderCasesScreen() {
    function renderCaseActionControls(caseRecord: CaseRecord) {
      const next = nextStatus(signedInUser, caseRecord);
      if (!next) {
        return (
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            No direct status transition available for role{' '}
            <strong>{roleLabels[signedInUser.role]}</strong> at stage{' '}
            <strong>{caseRecord.status}</strong>.
            {caseRecord.assignedBody !==
              (signedInUser.role === 'squad'
                ? 'Anti-Ragging Squad'
                : 'Anti-Ragging Committee') && (
              <span>
                {' '}
                (Case is currently assigned to {caseRecord.assignedBody}).
              </span>
            )}
          </p>
        );
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Permitted Transition:</span>
            <strong style={{ color: '#2563eb', fontSize: '1rem' }}>
              {caseRecord.status} → {next}
            </strong>
          </div>

          <label>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Finding / Action Note * (mandatory for history & audit)
            </span>
            <textarea
              rows={3}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder={`Enter detailed notes explaining the findings or actions for transition to ${next}...`}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
              }}
            />
          </label>

          <button
            type="button"
            className="primary-button"
            onClick={() => void handleStatusTransition(next)}
            disabled={handlerActionSubmitting}
            style={{ alignSelf: 'flex-start' }}
          >
            {handlerActionSubmitting ? 'Saving...' : `Advance Case to ${next}`}
          </button>
        </div>
      );
    }

    return (
      <div className="cases-workspace">
        {/* Left Column: Filter & Case List */}
        <aside className="cases-sidebar">
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
              placeholder="Search by ID, category..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['all', 'active', 'closed'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setCaseStatusFilter(filter)}
                style={{
                  flex: 1,
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background:
                    caseStatusFilter === filter ? '#2563eb' : '#f8fafc',
                  color: caseStatusFilter === filter ? '#fff' : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {filter.toUpperCase()}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '650px',
              overflowY: 'auto',
            }}
          >
            {visibleCases.map((c) => {
              const isSelected = c.id === selectedCase?.id;
              const isOverdue = deadlineState(c) === 'Overdue';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCaseId(c.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: isSelected
                      ? '2px solid #2563eb'
                      : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                      {c.id}
                    </strong>
                    <StatusPill status={c.status} />
                  </div>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}
                  >
                    {c.category}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '0.35rem',
                      fontSize: '0.72rem',
                      color: '#94a3b8',
                    }}
                  >
                    <span>{c.assignedBody}</span>
                    {c.dueDate && (
                      <span
                        style={{
                          color: isOverdue ? '#ef4444' : '#64748b',
                          fontWeight: isOverdue ? 600 : 400,
                        }}
                      >
                        Due: {c.dueDate}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {visibleCases.length === 0 && (
              <p
                style={{
                  padding: '1rem',
                  color: '#64748b',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                }}
              >
                No matching cases found.
              </p>
            )}
          </div>
        </aside>

        {/* Right Column: Case Details & Workflow Actions */}
        {selectedCase ? (
          <section className="cases-detail">
            {/* Case Header Card */}
            <div className="panel">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'center',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
                      {selectedCase.id}
                    </h1>
                    <StatusPill status={selectedCase.status} />
                    {deadlineState(selectedCase) === 'Overdue' && (
                      <span className="status-pill red">OVERDUE</span>
                    )}
                    {deadlineState(selectedCase) === 'Due soon' && (
                      <span className="status-pill amber">DUE SOON</span>
                    )}
                  </div>
                  <p
                    style={{
                      color: '#64748b',
                      margin: 0,
                      fontSize: '0.875rem',
                    }}
                  >
                    Category: <strong>{selectedCase.category}</strong> ·
                    Created:{' '}
                    {new Date(selectedCase.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '0.8rem',
                    color: '#64748b',
                  }}
                >
                  <div>
                    Initial Routing: <strong>{selectedCase.initialBody}</strong>
                  </div>
                  <div>
                    Current Assignment:{' '}
                    <strong style={{ color: '#2563eb' }}>
                      {selectedCase.assignedBody}
                    </strong>
                  </div>
                  {selectedCase.dueDate && (
                    <div>
                      Due Date: <strong>{selectedCase.dueDate}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '0.95rem',
                    margin: '0 0 0.5rem',
                    color: '#1e293b',
                  }}
                >
                  Incident Summary
                </h3>
                <p style={{ color: '#334155', lineHeight: 1.5, margin: 0 }}>
                  {selectedCase.description}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    marginTop: '1rem',
                    background: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>
                      Report Mode
                    </span>
                    <strong>
                      {selectedCase.reportMode === 'anonymous'
                        ? 'Confidential (Anonymous)'
                        : 'Named Student Report'}
                    </strong>
                  </div>
                  {selectedCase.reportMode === 'named' &&
                    selectedCase.reporterId && (
                      <div>
                        <span style={{ color: '#64748b', display: 'block' }}>
                          Reporter Identity
                        </span>
                        <strong>{selectedCase.reporterId}</strong>
                      </div>
                    )}
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>
                      Incident Date / Time
                    </span>
                    <strong>
                      {selectedCase.incidentDate
                        ? `${selectedCase.incidentDate} ${selectedCase.incidentTime || ''}`
                        : 'Not specified'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>
                      Location
                    </span>
                    <strong>{selectedCase.location || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>
                      Involved Persons
                    </span>
                    <strong>{selectedCase.people || 'Not specified'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Section */}
            <div className="panel">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                Supporting Evidence ({selectedCase.evidence.length})
              </h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {selectedCase.evidence.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.8rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <Paperclip
                        size={16}
                        style={{
                          display: 'inline',
                          marginRight: 6,
                          color: '#2563eb',
                        }}
                      />
                      <strong>{f.name}</strong> ·{' '}
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <a
                      href={`/api/files/${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-button"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      <Download size={14} /> Open file
                    </a>
                  </div>
                ))}
                {selectedCase.evidence.length === 0 && (
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    No evidence files attached to this case.
                  </p>
                )}
              </div>

              {/* Additional Evidence Form (Handlers during open status) */}
              {isCaseHandler && selectedCase.status !== 'Closed' && (
                <form
                  onSubmit={handleAttachEvidence}
                  style={{
                    marginTop: '1rem',
                    borderTop: '1px dashed #cbd5e1',
                    paddingTop: '1rem',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Attach Additional Investigative Evidence:
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEvidenceFile(e.target.files[0]);
                        }
                      }}
                      style={{ fontSize: '0.8rem' }}
                    />
                    <input
                      type="text"
                      value={evidenceNote}
                      onChange={(e) => setEvidenceNote(e.target.value)}
                      placeholder="Optional note explaining file..."
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.6rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                    <button
                      type="submit"
                      className="secondary-button"
                      disabled={evidenceSubmitting || !evidenceFile}
                    >
                      {evidenceSubmitting ? 'Uploading...' : 'Attach Evidence'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Case Management / Transition Actions */}
            {isCaseHandler && selectedCase.status !== 'Closed' && (
              <div
                className="panel"
                style={{
                  background: '#f8fafc',
                  borderColor: '#cbd5e1',
                  padding: '20px 22px',
                }}
              >
                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Record Investigation Update (UC-007)
                </h2>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    margin: '0 0 1rem',
                  }}
                >
                  Select the next permitted lifecycle transition and provide a
                  mandatory finding, observation, or action note.
                </p>

                {renderCaseActionControls(selectedCase)}
              </div>
            )}

            {/* Closed Case Reopening Panel */}
            {selectedCase.status === 'Closed' && (
              <div className="panel reopen-panel">
                <AlertTriangle size={24} color="#d97706" />
                <div>
                  <h2>Closed Case</h2>
                  <p>
                    This case was formally closed. Only an Anti-Ragging
                    Committee member can reopen it with a recorded reason.
                  </p>
                </div>

                {role === 'committee' ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      width: '100%',
                      marginTop: '0.5rem',
                    }}
                  >
                    <input
                      type="text"
                      value={reopenNote}
                      onChange={(e) => setReopenNote(e.target.value)}
                      placeholder="Mandatory reason for reopening (e.g. new evidence or retaliation)..."
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                      }}
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleReopenCase()}
                      disabled={handlerActionSubmitting}
                    >
                      {handlerActionSubmitting ? 'Reopening...' : 'Reopen Case'}
                    </button>
                  </div>
                ) : (
                  <StatusPill status="Committee permission required to reopen" />
                )}
              </div>
            )}

            {/* Case Details Edit Panel (Authorized handlers) */}
            {isCaseHandler && selectedCase.status !== 'Closed' && (
              <details className="panel" style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, color: '#334155' }}>
                  Modify Category or Due Date (with Audit Record)
                </summary>
                <div
                  style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                    }}
                  >
                    <label>
                      <span>Change Category</span>
                      <select
                        value={editCategory || selectedCase.category}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Change Due Date</span>
                      <input
                        type="date"
                        value={editDueDate || selectedCase.dueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Change Reason *</span>
                    <input
                      type="text"
                      value={editDetailsNote}
                      onChange={(e) => setEditDetailsNote(e.target.value)}
                      placeholder="Reason for changing category or deadline..."
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleUpdateCaseDetails()}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Save Category / Due Date Changes
                  </button>
                </div>
              </details>
            )}

            {/* Administrator Reassignment Panel */}
            {isAdmin && selectedCase.status !== 'Closed' && (
              <details className="panel" style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, color: '#334155' }}>
                  Administrative Reassignment (Current:{' '}
                  {selectedCase.assignedBody})
                </summary>
                <div
                  style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <label>
                    <span>Reassign Handling Body</span>
                    <select
                      value={reassignBody}
                      onChange={(e) =>
                        setReassignBody(
                          e.target.value as
                            | 'Anti-Ragging Squad'
                            | 'Anti-Ragging Committee',
                        )
                      }
                    >
                      <option value="Anti-Ragging Squad">
                        Anti-Ragging Squad
                      </option>
                      <option value="Anti-Ragging Committee">
                        Anti-Ragging Committee
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>Reassignment Reason *</span>
                    <input
                      type="text"
                      value={reassignNote}
                      onChange={(e) => setReassignNote(e.target.value)}
                      placeholder="Provide administrative justification for reassignment..."
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleReassignCase()}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Execute Reassignment
                  </button>
                </div>
              </details>
            )}

            {/* Case History Timeline */}
            <div className="panel">
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                Lifecycle & Status History
              </h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                {selectedCase.history.map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      display: 'flex',
                      gap: '0.75rem',
                      borderLeft: '2px solid #2563eb',
                      paddingLeft: '1rem',
                      marginLeft: '0.5rem',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <strong
                          style={{ fontSize: '0.9rem', color: '#1e293b' }}
                        >
                          {h.from} → {h.to}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {new Date(h.at).toLocaleString()}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '0.2rem 0',
                          color: '#334155',
                          fontSize: '0.85rem',
                        }}
                      >
                        {h.note}
                      </p>
                      {h.actor && (
                        <small
                          style={{ color: '#64748b', fontSize: '0.75rem' }}
                        >
                          Actor: {h.actor}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div
            className="panel"
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#64748b',
            }}
          >
            <ShieldAlert
              size={36}
              style={{
                margin: '0 auto 0.5rem',
                display: 'block',
                color: '#94a3b8',
              }}
            />
            <p>No cases available to display.</p>
          </div>
        )}
      </div>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderUndertakingScreen() {
    function renderStudentUndertakingForm() {
      const studentId =
        signedInUser.role === 'parent'
          ? signedInUser.studentId
          : signedInUser.id;
      const activeUt = undertakings.find(
        (u) => u.studentId === studentId && u.session === undertakingSession,
      );

      return (
        <>
          {activeUt && (
            <div className="panel" style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2>Undertaking for Session {activeUt.session}</h2>
                <StatusPill status={activeUt.status} />
              </div>

              {activeUt.status === 'Accepted/Verified' && (
                <p
                  style={{
                    color: '#10b981',
                    fontWeight: 600,
                    marginTop: '0.5rem',
                  }}
                >
                  ✓ Your anti-ragging undertaking has been verified and recorded
                  by the College Administrator.
                </p>
              )}

              {activeUt.status === 'Rejected' && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    margin: '0.75rem 0',
                  }}
                >
                  <strong style={{ color: '#b91c1c' }}>
                    Rejection Reason from Administrator:
                  </strong>
                  <p
                    style={{
                      margin: '0.25rem 0 0',
                      color: '#991b1b',
                    }}
                  >
                    {activeUt.reviews.at(-1)?.reason || 'Incomplete details.'}
                  </p>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#7f1d1d',
                      marginTop: '0.25rem',
                    }}
                  >
                    Please correct the issue and upload a new signed PDF below.
                  </p>
                </div>
              )}

              {activeUt.status === 'Pending Verification' && (
                <p style={{ color: '#d97706', marginTop: '0.5rem' }}>
                  Your undertaking is currently awaiting verification review by
                  the College Administrator.
                </p>
              )}

              {/* Prior submissions list */}
              <div style={{ marginTop: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>
                  Submitted Files:
                </strong>
                {activeUt.submissions.map((sub, i) => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      padding: '0.3rem 0',
                    }}
                  >
                    <span>
                      Version {i + 1}: {sub.file.name}
                    </span>
                    <a
                      href={`/api/files/${sub.file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb' }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission Form (Shown if not submitted or if rejected) */}
          {(!activeUt || activeUt.status === 'Rejected') && (
            <form className="form-panel" onSubmit={submitUndertaking}>
              <div className="identity-card">
                <UserRound />
                <div>
                  <span>
                    {signedInUser.role === 'parent'
                      ? 'Parent / Guardian submission for'
                      : 'Student'}
                  </span>
                  <strong>
                    {signedInUser.name} · Student ID: {studentId}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  margin: '1rem 0',
                }}
              >
                <label>
                  <span>Academic Session *</span>
                  <input
                    type="text"
                    value={undertakingSession}
                    onChange={(e) => setUndertakingSession(e.target.value)}
                    placeholder="2026-27"
                    required
                  />
                </label>
                <label>
                  <span>Parent / Guardian Name</span>
                  <input
                    type="text"
                    value={undertakingGuardian}
                    onChange={(e) => setUndertakingGuardian(e.target.value)}
                    placeholder="Full name of parent or guardian"
                  />
                </label>
              </div>

              <label className="upload-box">
                <Upload size={24} />
                <span>
                  <strong>Upload Signed Undertaking PDF *</strong>
                  <small>Signed PDF format only, maximum 10 MB</small>
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files && e.target.files[0]) {
                      setUndertakingFile(e.target.files[0]);
                    }
                  }}
                  required
                />
              </label>

              {undertakingFile && (
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    margin: '0.5rem 0',
                    fontSize: '0.85rem',
                  }}
                >
                  Selected: <strong>{undertakingFile.name}</strong> (
                  {(undertakingFile.size / 1024).toFixed(1)} KB)
                </div>
              )}

              <label className="check-row" style={{ margin: '1rem 0' }}>
                <input
                  type="checkbox"
                  checked={undertakingConfirmed}
                  onChange={(e) => setUndertakingConfirmed(e.target.checked)}
                  required
                />
                <span>
                  I confirm that both student and parent/guardian have signed
                  this anti-ragging declaration.
                </span>
              </label>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={undertakingSubmitting}
                >
                  {undertakingSubmitting
                    ? 'Uploading...'
                    : 'Submit Signed Undertaking'}{' '}
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
          )}
        </>
      );
    }

    return (
      <section className="undertaking-layout">
        <div>
          <SectionTitle
            eyebrow="UC-011"
            title={
              canVerify
                ? 'Verify Student Undertakings'
                : 'Submit Anti-Ragging Undertaking'
            }
            description={
              canVerify
                ? 'Review submitted signed PDF undertakings from students/guardians. Record acceptance or a specific rejection reason.'
                : 'Upload the signed undertaking PDF with parent/guardian confirmation. Resubmissions after rejection preserve prior history.'
            }
          />

          {canVerify ? (
            /* Verifier View: administrator, squad, committee, oversight (registrar/DoSA) */
            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Filter buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(
                  [
                    'all',
                    'Pending Verification',
                    'Accepted/Verified',
                    'Rejected',
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setUndertakingFilter(filter)}
                    className={
                      undertakingFilter === filter
                        ? 'primary-button'
                        : 'secondary-button'
                    }
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Undertaking List Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1rem',
                }}
              >
                {visibleUndertakings.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUndertakingId(u.id)}
                    style={{
                      padding: '1rem',
                      border:
                        u.id === selectedUndertaking?.id
                          ? '2px solid #2563eb'
                          : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background:
                        u.id === selectedUndertaking?.id ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{u.studentId}</strong>
                      <StatusPill status={u.status} />
                    </div>
                    <p
                      style={{
                        margin: '0.25rem 0',
                        fontSize: '0.85rem',
                        color: '#64748b',
                      }}
                    >
                      Session: {u.session} · Version {u.version}
                    </p>
                    <small style={{ color: '#94a3b8' }}>
                      {u.submissions.length} submission(s)
                    </small>
                  </button>
                ))}
              </div>

              {selectedUndertaking && (
                <div className="panel" style={{ marginTop: '1rem' }}>
                  <h2>
                    Verification Review for {selectedUndertaking.studentId} (
                    {selectedUndertaking.session})
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'center',
                      margin: '1rem 0',
                    }}
                  >
                    <StatusPill status={selectedUndertaking.status} />
                    <span>
                      Guardian:{' '}
                      {selectedUndertaking.guardianName || 'Self-declared'}
                    </span>
                  </div>

                  {/* Submissions & Files */}
                  <h3>
                    Submissions History (
                    {selectedUndertaking.submissions.length})
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {selectedUndertaking.submissions.map((sub, idx) => (
                      <div
                        key={sub.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.6rem 0.8rem',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                        }}
                      >
                        <div>
                          <strong>Submission #{idx + 1}</strong>:{' '}
                          {sub.file.name}
                          <span
                            style={{
                              color: '#64748b',
                              fontSize: '0.8rem',
                              marginLeft: 8,
                            }}
                          >
                            ({new Date(sub.at).toLocaleString()})
                          </span>
                        </div>
                        <a
                          href={`/api/files/${sub.file.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="secondary-button"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.6rem',
                          }}
                        >
                          <Download size={14} /> Open Signed PDF
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* Review Decisions History */}
                  {selectedUndertaking.reviews.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <h3>Recorded Decisions</h3>
                      {selectedUndertaking.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background:
                              rev.decision === 'Accepted/Verified'
                                ? '#ecfdf5'
                                : '#fef2f2',
                            border: `1px solid ${rev.decision === 'Accepted/Verified' ? '#a7f3d0' : '#fecaca'}`,
                            borderRadius: '6px',
                            marginBottom: '0.5rem',
                            fontSize: '0.85rem',
                          }}
                        >
                          <strong>{rev.decision}</strong> by {rev.reviewer} on{' '}
                          {new Date(rev.at).toLocaleString()}
                          {rev.reason && (
                            <p
                              style={{ margin: '0.2rem 0 0', color: '#334155' }}
                            >
                              Note: {rev.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Panel for Administrator */}
                  {selectedUndertaking.status === 'Pending Verification' && (
                    <div
                      style={{
                        borderTop: '1px solid #e2e8f0',
                        paddingTop: '1rem',
                      }}
                    >
                      <label>
                        <span style={{ fontWeight: 600 }}>
                          Rejection Reason (required if rejecting)
                        </span>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain why the undertaking was rejected (e.g. illegible signature, wrong session)..."
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                          }}
                        />
                      </label>

                      <div
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          marginTop: '1rem',
                        }}
                      >
                        <button
                          type="button"
                          className="primary-button"
                          style={{ background: '#10b981' }}
                          onClick={() =>
                            void reviewUndertaking('Accepted/Verified')
                          }
                          disabled={reviewSubmitting}
                        >
                          Accept / Verify Undertaking
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ borderColor: '#ef4444', color: '#ef4444' }}
                          onClick={() => void reviewUndertaking('Rejected')}
                          disabled={reviewSubmitting}
                        >
                          Reject with Reason
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : canSubmitUndertaking ? (
            /* Student / Guardian Submission View */
            <div style={{ marginTop: '1.5rem' }}>
              {renderStudentUndertakingForm()}
            </div>
          ) : (
            /* Fallback: roles that can neither submit nor verify */
            <div
              style={{
                marginTop: '2rem',
                padding: '2rem',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <ShieldCheck
                size={36}
                style={{
                  margin: '0 auto 0.75rem',
                  display: 'block',
                  color: '#94a3b8',
                }}
              />
              <p>
                Undertaking submission is only available to students and
                parents/guardians.
              </p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderDirectoryScreen() {
    return (
      <>
        <section className="welcome-row">
          <SectionTitle
            eyebrow="UC-010"
            title="Committee & Squad Directory"
            description="Authorized contacts for the Anti-Ragging Squad, Anti-Ragging Committee, Student Grievance Redressal Cell (SGRC) and Internal Complaints Committee (ICC)."
          />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="reference-access">
              <Users size={19} />
              {activeDirectoryCount} Active Directory Members
            </div>
            {isAdmin && (
              <button
                className="primary-button"
                onClick={() => setShowAddDirModal(true)}
              >
                + Add Directory Member
              </button>
            )}
          </div>
        </section>

        {/* Directory Grid */}
        <section className="directory-grid" style={{ marginTop: '1.5rem' }}>
          {directory.map((entry) => (
            <article className="directory-card" key={entry.id}>
              <div className="directory-icon">
                <Users size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p>{entry.body}</p>
                <h2>{entry.member}</h2>
                <span>{entry.designation}</span>
                <a href={`mailto:${entry.contact}`}>{entry.contact}</a>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '0.5rem',
                }}
              >
                <StatusPill status={entry.active ? 'Active' : 'Inactive'} />
                {isAdmin && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleToggleDirectoryActive(entry)}
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                  >
                    {entry.active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>

        {/* Add Member Modal */}
        {showAddDirModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
          >
            <form
              onSubmit={handleAddDirectoryEntry}
              className="panel"
              style={{ width: '480px', maxWidth: '90vw' }}
            >
              <h2>Add Directory Entry</h2>
              <label style={{ display: 'block', margin: '0.75rem 0' }}>
                <span>Body *</span>
                <select
                  value={newDirBody}
                  onChange={(e) => setNewDirBody(e.target.value)}
                >
                  <option value="Anti-Ragging Squad">Anti-Ragging Squad</option>
                  <option value="Anti-Ragging Committee">
                    Anti-Ragging Committee
                  </option>
                </select>
              </label>
              <label style={{ display: 'block', margin: '0.75rem 0' }}>
                <span>Member Name *</span>
                <input
                  type="text"
                  value={newDirMember}
                  onChange={(e) => setNewDirMember(e.target.value)}
                  placeholder="Dr. John Doe"
                  required
                />
              </label>
              <label style={{ display: 'block', margin: '0.75rem 0' }}>
                <span>Designation *</span>
                <input
                  type="text"
                  value={newDirDesignation}
                  onChange={(e) => setNewDirDesignation(e.target.value)}
                  placeholder="Faculty Coordinator"
                  required
                />
              </label>
              <label style={{ display: 'block', margin: '0.75rem 0' }}>
                <span>Contact Email *</span>
                <input
                  type="email"
                  value={newDirContact}
                  onChange={(e) => setNewDirContact(e.target.value)}
                  placeholder="member@arms.test"
                  required
                />
              </label>
              <div className="form-actions" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddDirModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Member
                </button>
              </div>
            </form>
          </div>
        )}
      </>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderReportsScreen() {
    return (
      <>
        <section className="welcome-row">
          <SectionTitle
            eyebrow="FR-022"
            title="Case & Workload Reports"
            description="Aggregate reporting on case volumes, category breakdowns, handling body workload, and resolution metrics."
          />
          <a
            href="/api/reports/cases?format=csv"
            className="primary-button"
            download="arms_cases_report.csv"
          >
            <Download size={17} /> Export Case Data (CSV)
          </a>
        </section>

        {/* Breakdown Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginTop: '1.5rem',
          }}
        >
          <div className="panel">
            <h2>Cases by Category</h2>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {categories.map((cat) => {
                const count = cases.filter((c) => c.category === cat).length;
                const pct =
                  cases.length > 0
                    ? ((count / cases.length) * 100).toFixed(0)
                    : 0;
                return (
                  <div key={cat}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span>{cat}</span>
                      <strong>
                        {count} ({pct}%)
                      </strong>
                    </div>
                    <div
                      style={{
                        background: '#e2e8f0',
                        borderRadius: '4px',
                        height: '6px',
                        overflow: 'hidden',
                        marginTop: '4px',
                      }}
                    >
                      <div
                        style={{
                          background: '#2563eb',
                          height: '100%',
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <h2>Cases by Assigned Body</h2>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              {(
                [
                  'Anti-Ragging Squad',
                  'Anti-Ragging Committee',
                  'Administrator review',
                ] as const
              ).map((b) => {
                const count = cases.filter((c) => c.assignedBody === b).length;
                return (
                  <div
                    key={b}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <span>{b}</span>
                    <strong>{count} case(s)</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <h2>Status Distribution</h2>
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Active Cases:</span>
                <strong style={{ color: '#2563eb' }}>{activeCasesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Closed Cases:</span>
                <strong style={{ color: '#10b981' }}>{closedCasesCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Overdue Cases:</span>
                <strong style={{ color: '#ef4444' }}>
                  {overdueCasesCount}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderAuditScreen() {
    return (
      <>
        <section className="welcome-row">
          <SectionTitle
            eyebrow="FR-023"
            title="System Audit Trail"
            description="Complete chronological record of security and case management actions. Retains full history without arbitrary caps."
          />
          <div className="reference-access">
            <HistoryIcon size={19} />
            {auditLogs.length} Recorded Events
          </div>
        </section>

        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: '700px',
              overflowY: 'auto',
            }}
          >
            {auditLogs
              .slice()
              .reverse()
              .map((a) => (
                <div
                  key={a.id}
                  style={{
                    padding: '0.65rem 0.85rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>{a.action}</strong> ·{' '}
                    <span style={{ color: '#64748b' }}>
                      Target: {a.targetId}
                    </span>
                    {a.actor && (
                      <p
                        style={{
                          margin: '0.2rem 0 0',
                          fontSize: '0.78rem',
                          color: '#475569',
                        }}
                      >
                        Actor: {a.actor}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(a.at).toLocaleString()}
                  </span>
                </div>
              ))}
            {auditLogs.length === 0 && (
              <p style={{ color: '#64748b' }}>No audit records available.</p>
            )}
          </div>
        </div>
      </>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderUsersScreen() {
    return (
      <>
        <section className="welcome-row">
          <SectionTitle
            eyebrow="FR-004"
            title="User Account Administration"
            description="Authorized role assignments and account maintenance. All modifications are recorded in the system audit trail."
          />
          <div className="reference-access">
            <UserCog size={19} />
            {snapshot?.users.length ?? 0} Accounts
          </div>
        </section>

        <div className="panel" style={{ marginTop: '1.5rem' }}>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            {(snapshot?.users ?? []).map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#fff',
                }}
              >
                <div>
                  <strong>{u.name}</strong> ·{' '}
                  <span style={{ color: '#64748b' }}>{u.email}</span>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      marginTop: 2,
                    }}
                  >
                    User ID: {u.id}{' '}
                    {u.studentId && `· Linked Student: ${u.studentId}`}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                  }}
                >
                  <select
                    value={selectedUserRole[u.id] || u.role}
                    onChange={(e) => {
                      const newR = e.target.value as Role;
                      setSelectedUserRole((prev) => ({
                        ...prev,
                        [u.id]: newR,
                      }));
                      void handleRoleChange(u, newR);
                    }}
                    disabled={u.id === signedInUser.id}
                    style={{
                      padding: '0.3rem 0.5rem',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.8rem',
                    }}
                  >
                    {Object.entries(roleLabels).map(([r, label]) => (
                      <option key={r} value={r}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleToggleUserActive(u)}
                    disabled={u.id === signedInUser.id}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  >
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Screen markup; the form handlers above perform the actual API calls.
  function renderReferenceScreen() {
    return (
      <>
        <section className="welcome-row">
          <SectionTitle
            eyebrow="FR-018"
            title="Punishment & Disciplinary Guidance"
            description="Illustrative project examples only. No approved institute reference has been supplied for this course prototype, and ARMS does not automatically impose fines or penalties."
          />
          <div className="reference-access">
            <Gavel size={19} />
            Authorized Reference View
          </div>
        </section>

        <section
          className="panel reference-panel"
          style={{ marginTop: '1.5rem' }}
        >
          <div className="reference-head">
            <span>Level</span>
            <span>Case Category</span>
            <span>Recommended Disciplinary Action</span>
            <span>Fine / Source</span>
          </div>
          {references.map((item) => (
            <div className="reference-row" key={item.id}>
              <strong>{item.level}</strong>
              <span>{item.category}</span>
              <span>{item.action}</span>
              <span>
                {item.source} (Fine: {item.fine})
              </span>
            </div>
          ))}
        </section>

        <section className="panel admin-note" style={{ marginTop: '1.5rem' }}>
          <Landmark />
          <div>
            <h2>Institutional Disciplinary Authority</h2>
            <p>
              All disciplinary sanctions remain the prerogative of the competent
              institutional authority and Anti-Ragging Committee. No approved
              institute fine reference has been supplied, and no penalties are
              automated.
            </p>
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={24} strokeWidth={2.2} />
          </div>
          <div>
            <strong>ARMS</strong>
            <span>LNMIIT Prototype</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navigationItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={view === id ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setView(id);
                setMenuOpen(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="help-card">
            <ShieldCheck size={20} />
            <strong>Anti-Ragging Helpline</strong>
            <span>Emergency 24x7 Campus Helpline: 1800-180-5522</span>
            {signedInUser.id !== 'anonymous' && (
              <button type="button" onClick={() => setView('directory')}>
                Directory Contacts
              </button>
            )}
          </div>
          <button
            type="button"
            className="nav-item"
            onClick={() => void handleLogout()}
          >
            <LogOut size={19} />
            <span>
              {signedInUser.id === 'anonymous'
                ? 'Return to sign in'
                : `Sign out (${signedInUser.name})`}
            </span>
          </button>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <div>
              <span>
                Anti-Ragging Monitoring System ·{' '}
                <strong>
                  {signedInUser.id === 'anonymous'
                    ? 'Anonymous visitor'
                    : roleLabels[signedInUser.role]}
                </strong>
              </span>
              <strong>
                {navigationItems.find((n) => n.id === view)?.label ??
                  'Overview'}
              </strong>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Notification Drawer */}
            <div className="notification-wrap">
              <button
                className="icon-button"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen((o) => !o)}
                style={{ position: 'relative' }}
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#ef4444',
                    }}
                  />
                )}
              </button>
              {notificationsOpen && (
                <section
                  className="notification-panel"
                  aria-label="Recent notifications"
                >
                  <div>
                    <strong>
                      In-App Notifications ({notifications.length})
                    </strong>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      background: '#f8fafc',
                    }}
                  >
                    <small>
                      Mock delivery for viva demonstration. External email
                      gateway not connected.
                    </small>
                  </div>
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      style={{
                        opacity: n.read ? 0.7 : 1,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        padding: '0.6rem 0.75rem',
                        width: '100%',
                        display: 'flex',
                        gap: '0.5rem',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                      onClick={() => void handleReadNotification(n.id)}
                    >
                      <MailCheck
                        size={16}
                        style={{ flexShrink: 0, marginTop: 2 }}
                      />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        {n.message}
                        <span
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            marginTop: 2,
                          }}
                        >
                          {new Date(n.at).toLocaleString()}
                        </span>
                      </p>
                    </button>
                  ))}
                  {notifications.length === 0 && (
                    <p style={{ padding: '1rem', color: '#64748b' }}>
                      No notifications.
                    </p>
                  )}
                </section>
              )}
            </div>

            <div
              className="avatar"
              title={`${signedInUser.name} (${signedInUser.email}) - Role: ${roleLabels[signedInUser.role]}`}
            >
              {signedInUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        </header>

        {/* Prototype Banner */}
        <div className="prototype-banner" role="note">
          <ShieldCheck size={18} />
          <span>
            <strong>ARMS Prototype:</strong>{' '}
            {signedInUser.id === 'anonymous' ? (
              'Public anonymous reporting. No login session or access to protected records.'
            ) : (
              <>
                Server-authenticated session for{' '}
                <strong>{signedInUser.name}</strong> (
                {roleLabels[signedInUser.role]}). Local SQLite persistence.
              </>
            )}
          </span>
        </div>

        {/* Toast Notification */}
        {notice && (
          <output
            className="toast"
            style={{
              borderColor: notice.type === 'error' ? '#ef4444' : '#10b981',
            }}
          >
            {notice.type === 'error' ? (
              <AlertTriangle size={19} color="#ef4444" />
            ) : (
              <CheckCircle2 size={19} color="#10b981" />
            )}
            <span>{notice.message}</span>
            <button
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </output>
        )}

        <div className="page-wrap">
          {/* VIEW: OVERVIEW */}
          {view === 'overview' && renderOverviewScreen()}

          {/* VIEW: UC-003 REPORT INCIDENT */}
          {view === 'report' && renderReportScreen()}

          {/* VIEW: UC-007 CASES WORKSPACE */}
          {view === 'cases' && renderCasesScreen()}

          {/* VIEW: UC-011 UNDERTAKINGS */}
          {view === 'undertaking' && renderUndertakingScreen()}

          {/* VIEW: UC-010 DIRECTORY */}
          {view === 'directory' && renderDirectoryScreen()}

          {/* VIEW: CASE & WORKLOAD REPORTS (FR-022) */}
          {view === 'reports' && renderReportsScreen()}

          {/* VIEW: AUDIT LOG (FR-023) */}
          {view === 'audit' && renderAuditScreen()}

          {/* VIEW: USER MANAGEMENT (FR-004) */}
          {view === 'users' && isAdmin && renderUsersScreen()}

          {/* VIEW: PUNISHMENT REFERENCE (FR-018) */}
          {view === 'reference' && renderReferenceScreen()}
        </div>
      </main>
    </div>
  );
}
