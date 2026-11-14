import type { CaseRecord, DirectoryEntry, Reference, State, Undertaking, User } from './model';

export const DUMMY_PDF_BASE64 = Buffer.from(
  `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length 55
>>
stream
BT
/F1 16 Tf
50 700 Td
(Anti-Ragging Undertaking - Signed Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000068 00000 n 
0000000125 00000 n 
0000000318 00000 n 
trailer
<<
  /Size 5
  /Root 1 0 R
>>
startxref
424
%%EOF
`,
).toString('base64');

export const DUMMY_PNG_HEX =
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d400000000049454e44ae426082';

export function sampleFiles(): {
  id: string;
  name: string;
  mime: string;
  size: number;
  buffer: Buffer;
  uploadedBy: string;
  uploadedAt: string;
}[] {
  const pdfBuf = Buffer.from(DUMMY_PDF_BASE64, 'base64');
  const pngBuf = Buffer.from(DUMMY_PNG_HEX, 'hex');

  return [
    {
      id: 'file-evidence-151',
      name: 'hostel_incident_note.pdf',
      mime: 'application/pdf',
      size: pdfBuf.length,
      buffer: pdfBuf,
      uploadedBy: 'somik',
      uploadedAt: '2026-09-18T21:30:00.000Z',
    },
    {
      id: 'file-evidence-142',
      name: 'witness_statement.pdf',
      mime: 'application/pdf',
      size: pdfBuf.length,
      buffer: pdfBuf,
      uploadedBy: 'somik',
      uploadedAt: '2026-09-15T18:00:00.000Z',
    },
    {
      id: 'file-evidence-107',
      name: 'chat_capture.png',
      mime: 'image/png',
      size: pngBuf.length,
      buffer: pngBuf,
      uploadedBy: 'aman',
      uploadedAt: '2026-09-10T22:15:00.000Z',
    },
    {
      id: 'file-ut-aman',
      name: 'aman_undertaking_2026_27.pdf',
      mime: 'application/pdf',
      size: pdfBuf.length,
      buffer: pdfBuf,
      uploadedBy: 'aman',
      uploadedAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'file-ut-somik',
      name: 'somik_undertaking_2025_26.pdf',
      mime: 'application/pdf',
      size: pdfBuf.length,
      buffer: pdfBuf,
      uploadedBy: 'somik',
      uploadedAt: '2025-08-15T11:00:00.000Z',
    },
  ];
}

export function initialSeedState(): { state: State } {
  const users: User[] = [
    { id: 'somik', name: 'Somik Jain', email: 'somik@arms.test', role: 'student', active: true },
    { id: 'aman', name: 'Aman Verma', email: 'aman@arms.test', role: 'student', active: true },
    {
      id: 'guardian',
      name: 'Demo guardian',
      email: 'guardian@arms.test',
      role: 'parent',
      active: true,
      studentId: 'somik',
    },
    { id: 'squad', name: 'Dr. A. Sharma', email: 'squad@arms.test', role: 'squad', active: true },
    { id: 'squad2', name: 'Mr. R. Meena', email: 'squad2@arms.test', role: 'squad', active: true },
    { id: 'committee', name: 'Dr. S. Kapoor', email: 'committee@arms.test', role: 'committee', active: true },
    { id: 'committee2', name: 'Ms. P. Nair', email: 'committee2@arms.test', role: 'committee', active: true },
    { id: 'admin', name: 'College Administrator', email: 'admin@arms.test', role: 'administrator', active: true },
    { id: 'oversight', name: 'Demo Registrar / DoSA', email: 'oversight@arms.test', role: 'oversight', active: true },
  ];

  const directory: DirectoryEntry[] = [
    {
      id: 'dir-1',
      userId: 'squad',
      body: 'Anti-Ragging Squad',
      member: 'Dr. A. Sharma',
      designation: 'Faculty coordinator / Enquiry officer',
      contact: 'squad@arms.test',
      active: true,
    },
    {
      id: 'dir-2',
      userId: 'squad2',
      body: 'Anti-Ragging Squad',
      member: 'Mr. R. Meena',
      designation: 'Student welfare officer',
      contact: 'squad2@arms.test',
      active: true,
    },
    {
      id: 'dir-3',
      userId: 'committee',
      body: 'Anti-Ragging Committee',
      member: 'Dr. S. Kapoor',
      designation: 'Committee chair',
      contact: 'committee@arms.test',
      active: true,
    },
    {
      id: 'dir-4',
      userId: 'committee2',
      body: 'Anti-Ragging Committee',
      member: 'Ms. P. Nair',
      designation: 'Committee member',
      contact: 'committee2@arms.test',
      active: true,
    },
    {
      id: 'dir-5',
      userId: '',
      body: 'Student Grievance Redressal Cell',
      member: 'Dr. M. Verma',
      designation: 'Faculty member',
      contact: 'sgrc@lnmiit.ac.in',
      active: true,
    },
    {
      id: 'dir-6',
      userId: '',
      body: 'Internal Complaints Committee',
      member: 'Ms. R. Dutta',
      designation: 'Presiding officer',
      contact: 'icc@lnmiit.ac.in',
      active: true,
    },
  ];

  const cases: CaseRecord[] = [
    {
      id: 'ARMS-2026-0151',
      reporterId: 'somik',
      reportMode: 'named',
      category: 'Physical intimidation',
      description: 'Unwarranted physical confrontation and intimidation near hostel entrance.',
      incidentDate: '2026-09-18',
      incidentTime: '21:30',
      location: 'Hostel block',
      people: 'Two senior students',
      status: 'Acknowledged',
      initialBody: 'Anti-Ragging Squad',
      assignedBody: 'Anti-Ragging Squad',
      dueDate: '2026-10-26',
      createdAt: '2026-09-18T21:30:00.000Z',
      updatedAt: '2026-09-18T21:30:00.000Z',
      version: 1,
      evidence: [
        {
          id: 'file-evidence-151',
          name: 'hostel_incident_note.pdf',
          mime: 'application/pdf',
          size: 512,
          uploadedBy: 'somik',
          uploadedAt: '2026-09-18T21:30:00.000Z',
        },
      ],
      history: [
        {
          id: 'hist-151-1',
          from: 'Reported',
          to: 'Acknowledged',
          note: 'Report received and assigned for initial enquiry to Anti-Ragging Squad.',
          actorId: 'system',
          actor: 'ARMS',
          at: '2026-09-18T21:30:00.000Z',
        },
      ],
    },
    {
      id: 'ARMS-2026-0142',
      reporterId: 'somik',
      reportMode: 'named',
      category: 'Verbal harassment',
      description: 'Repeated verbal abuse and derogatory remarks in the academic corridor.',
      incidentDate: '2026-09-15',
      incidentTime: '17:45',
      location: 'Academic block',
      people: 'Group of 3 seniors',
      status: 'Under Investigation',
      initialBody: 'Anti-Ragging Squad',
      assignedBody: 'Anti-Ragging Squad',
      dueDate: '2026-10-25',
      createdAt: '2026-09-15T18:00:00.000Z',
      updatedAt: '2026-09-16T10:00:00.000Z',
      version: 2,
      evidence: [
        {
          id: 'file-evidence-142',
          name: 'witness_statement.pdf',
          mime: 'application/pdf',
          size: 512,
          uploadedBy: 'somik',
          uploadedAt: '2026-09-15T18:00:00.000Z',
        },
      ],
      history: [
        {
          id: 'hist-142-1',
          from: 'Reported',
          to: 'Acknowledged',
          note: 'Report received; initial assignment: Anti-Ragging Squad.',
          actorId: 'system',
          actor: 'ARMS',
          at: '2026-09-15T18:00:00.000Z',
        },
        {
          id: 'hist-142-2',
          from: 'Acknowledged',
          to: 'Under Investigation',
          note: 'Initial enquiry started and statements requested.',
          actorId: 'squad',
          actor: 'Dr. A. Sharma',
          at: '2026-09-16T10:00:00.000Z',
        },
      ],
    },
    {
      id: 'ARMS-2026-0107',
      reporterId: 'aman',
      reportMode: 'named',
      category: 'Online harassment',
      description: 'Abusive messages and threats sent on student social media groups.',
      incidentDate: '2026-09-10',
      incidentTime: '22:00',
      location: 'Online platform',
      people: 'Anonymous handle',
      status: 'Action Taken',
      initialBody: 'Anti-Ragging Committee',
      assignedBody: 'Anti-Ragging Committee',
      dueDate: '2026-10-20',
      createdAt: '2026-09-10T22:15:00.000Z',
      updatedAt: '2026-09-16T16:20:00.000Z',
      version: 5,
      evidence: [
        {
          id: 'file-evidence-107',
          name: 'chat_capture.png',
          mime: 'image/png',
          size: 70,
          uploadedBy: 'aman',
          uploadedAt: '2026-09-10T22:15:00.000Z',
        },
      ],
      history: [
        {
          id: 'hist-107-1',
          from: 'Reported',
          to: 'Acknowledged',
          note: 'Report received; initial assignment: Anti-Ragging Committee (Online harassment rule).',
          actorId: 'system',
          actor: 'ARMS',
          at: '2026-09-10T22:15:00.000Z',
        },
        {
          id: 'hist-107-2',
          from: 'Acknowledged',
          to: 'Under Investigation',
          note: 'Committee initiated digital communication enquiry.',
          actorId: 'committee',
          actor: 'Dr. S. Kapoor',
          at: '2026-09-11T11:00:00.000Z',
        },
        {
          id: 'hist-107-3',
          from: 'Under Investigation',
          to: 'Findings Recorded',
          note: 'Digital logs and communication records verified.',
          actorId: 'committee2',
          actor: 'Ms. P. Nair',
          at: '2026-09-12T14:10:00.000Z',
        },
        {
          id: 'hist-107-4',
          from: 'Findings Recorded',
          to: 'Committee Decision Recorded',
          note: 'Committee recorded formal disciplinary decision and counselling recommendation.',
          actorId: 'committee',
          actor: 'Dr. S. Kapoor',
          at: '2026-09-14T15:30:00.000Z',
        },
        {
          id: 'hist-107-5',
          from: 'Committee Decision Recorded',
          to: 'Action Taken',
          note: 'Counseling session completed and formal warning issued.',
          actorId: 'committee',
          actor: 'Dr. S. Kapoor',
          at: '2026-09-16T16:20:00.000Z',
        },
      ],
    },
    {
      id: 'ARMS-2026-0084',
      reporterId: 'somik',
      reportMode: 'named',
      category: 'Physical intimidation',
      description: 'Hostel corridor incident involving intimidation during orientation week.',
      incidentDate: '2026-08-28',
      incidentTime: '20:00',
      location: 'Campus common area',
      people: '2 senior students',
      status: 'Closed',
      initialBody: 'Anti-Ragging Squad',
      assignedBody: 'Anti-Ragging Committee',
      dueDate: '2026-09-15',
      createdAt: '2026-08-28T20:30:00.000Z',
      updatedAt: '2026-09-12T15:00:00.000Z',
      version: 6,
      evidence: [],
      history: [
        {
          id: 'hist-084-1',
          from: 'Reported',
          to: 'Acknowledged',
          note: 'Report received; initial assignment: Anti-Ragging Squad.',
          actorId: 'system',
          actor: 'ARMS',
          at: '2026-08-28T20:30:00.000Z',
        },
        {
          id: 'hist-084-2',
          from: 'Acknowledged',
          to: 'Under Investigation',
          note: 'Squad commenced enquiry and took statements.',
          actorId: 'squad',
          actor: 'Dr. A. Sharma',
          at: '2026-08-29T10:00:00.000Z',
        },
        {
          id: 'hist-084-3',
          from: 'Under Investigation',
          to: 'Findings Recorded',
          note: 'Physical intimidation established; escalation recommended.',
          actorId: 'squad2',
          actor: 'Mr. R. Meena',
          at: '2026-09-02T16:00:00.000Z',
        },
        {
          id: 'hist-084-4',
          from: 'Findings Recorded',
          to: 'Escalated to Committee',
          note: 'Matter escalated to Anti-Ragging Committee.',
          actorId: 'squad',
          actor: 'Dr. A. Sharma',
          at: '2026-09-03T11:00:00.000Z',
        },
        {
          id: 'hist-084-5',
          from: 'Escalated to Committee',
          to: 'Committee Decision Recorded',
          note: 'Disciplinary hearing conducted. Parent notification and written undertakings required.',
          actorId: 'committee',
          actor: 'Dr. S. Kapoor',
          at: '2026-09-08T14:00:00.000Z',
        },
        {
          id: 'hist-084-6',
          from: 'Committee Decision Recorded',
          to: 'Action Taken',
          note: 'Parents notified; formal undertaking submitted by involved parties.',
          actorId: 'committee',
          actor: 'Dr. S. Kapoor',
          at: '2026-09-10T12:30:00.000Z',
        },
        {
          id: 'hist-084-7',
          from: 'Action Taken',
          to: 'Closed',
          note: 'All remedial actions verified and closed by Committee.',
          actorId: 'committee',
          actor: 'Dr. S. Kapoor',
          at: '2026-09-12T15:00:00.000Z',
        },
      ],
    },
  ];

  const undertakings: Undertaking[] = [
    {
      id: 'ut-aman-2026',
      studentId: 'aman',
      session: '2026-27',
      guardianName: 'S. Singh',
      status: 'Pending Verification',
      version: 1,
      submissions: [
        {
          id: 'sub-aman-1',
          file: {
            id: 'file-ut-aman',
            name: 'aman_undertaking_2026_27.pdf',
            mime: 'application/pdf',
            size: 512,
            uploadedBy: 'aman',
            uploadedAt: '2026-09-20T10:00:00.000Z',
          },
          submittedBy: 'aman',
          at: '2026-09-20T10:00:00.000Z',
        },
      ],
      reviews: [],
    },
    {
      id: 'ut-somik-2025',
      studentId: 'somik',
      session: '2025-26',
      guardianName: 'R. Jain',
      status: 'Accepted/Verified',
      version: 1,
      submissions: [
        {
          id: 'sub-somik-1',
          file: {
            id: 'file-ut-somik',
            name: 'somik_undertaking_2025_26.pdf',
            mime: 'application/pdf',
            size: 512,
            uploadedBy: 'somik',
            uploadedAt: '2025-08-15T11:00:00.000Z',
          },
          submittedBy: 'somik',
          at: '2025-08-15T11:00:00.000Z',
        },
      ],
      reviews: [
        {
          id: 'rev-somik-1',
          decision: 'Accepted/Verified',
          reason: 'Signed student and guardian undertaking verified against academic records.',
          reviewerId: 'admin',
          reviewer: 'College Administrator',
          at: '2025-08-16T14:30:00.000Z',
          submissionId: 'sub-somik-1',
        },
      ],
    },
  ];

  const references: Reference[] = [
    {
      id: 'ref-1',
      level: 'Example 1',
      category: 'Misconduct requiring an initial response',
      action: 'Written warning and counselling, if the competent authority considers them appropriate.',
      fine: 'Not specified',
      source: 'Illustrative course prototype example (no approved reference supplied)',
      effectiveDate: '',
    },
    {
      id: 'ref-2',
      level: 'Example 2',
      category: 'Repeated or serious misconduct',
      action: 'Committee review and a documented disciplinary decision after examining the facts.',
      fine: 'Not specified',
      source: 'Illustrative course prototype example (no approved reference supplied)',
      effectiveDate: '',
    },
    {
      id: 'ref-3',
      level: 'Example 3',
      category: 'Severe misconduct',
      action: 'Referral to the competent institutional authority for action under applicable rules.',
      fine: 'Not specified',
      source: 'Illustrative course prototype example (no approved reference supplied)',
      effectiveDate: '',
    },
  ];

  const audit = [
    {
      id: 'aud-01',
      actorId: 'somik',
      actor: 'Somik Jain',
      action: 'Report submitted: ARMS-2026-0151',
      targetId: 'ARMS-2026-0151',
      at: '2026-09-18T21:30:00.000Z',
    },
    {
      id: 'aud-02',
      actorId: 'system',
      actor: 'ARMS',
      action: 'Initial assignment: Anti-Ragging Squad',
      targetId: 'ARMS-2026-0151',
      at: '2026-09-18T21:30:01.000Z',
    },
    {
      id: 'aud-03',
      actorId: 'somik',
      actor: 'Somik Jain',
      action: 'Report submitted: ARMS-2026-0142',
      targetId: 'ARMS-2026-0142',
      at: '2026-09-15T18:00:00.000Z',
    },
    {
      id: 'aud-04',
      actorId: 'squad',
      actor: 'Dr. A. Sharma',
      action: 'Case status changed: Under Investigation',
      targetId: 'ARMS-2026-0142',
      at: '2026-09-16T10:00:00.000Z',
    },
    {
      id: 'aud-05',
      actorId: 'aman',
      actor: 'Aman Verma',
      action: 'Report submitted: ARMS-2026-0107',
      targetId: 'ARMS-2026-0107',
      at: '2026-09-10T22:15:00.000Z',
    },
    {
      id: 'aud-06',
      actorId: 'system',
      actor: 'ARMS',
      action: 'Category routing: Online harassment -> Anti-Ragging Committee',
      targetId: 'ARMS-2026-0107',
      at: '2026-09-10T22:15:01.000Z',
    },
    {
      id: 'aud-07',
      actorId: 'committee',
      actor: 'Dr. S. Kapoor',
      action: 'Case status changed: Under Investigation',
      targetId: 'ARMS-2026-0107',
      at: '2026-09-11T11:00:00.000Z',
    },
    {
      id: 'aud-08',
      actorId: 'committee2',
      actor: 'Ms. P. Nair',
      action: 'Case status changed: Findings Recorded',
      targetId: 'ARMS-2026-0107',
      at: '2026-09-12T14:10:00.000Z',
    },
    {
      id: 'aud-09',
      actorId: 'committee',
      actor: 'Dr. S. Kapoor',
      action: 'Case status changed: Committee Decision Recorded',
      targetId: 'ARMS-2026-0107',
      at: '2026-09-14T15:30:00.000Z',
    },
    {
      id: 'aud-10',
      actorId: 'committee',
      actor: 'Dr. S. Kapoor',
      action: 'Case status changed: Action Taken',
      targetId: 'ARMS-2026-0107',
      at: '2026-09-16T16:20:00.000Z',
    },
    {
      id: 'aud-11',
      actorId: 'aman',
      actor: 'Aman Verma',
      action: 'Undertaking submitted for session 2026-27',
      targetId: 'ut-aman-2026',
      at: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'aud-12',
      actorId: 'somik',
      actor: 'Somik Jain',
      action: 'Undertaking submitted for session 2025-26',
      targetId: 'ut-somik-2025',
      at: '2025-08-15T11:00:00.000Z',
    },
    {
      id: 'aud-13',
      actorId: 'admin',
      actor: 'College Administrator',
      action: 'Undertaking Accepted/Verified for session 2025-26',
      targetId: 'ut-somik-2025',
      at: '2025-08-16T14:30:00.000Z',
    },
    {
      id: 'aud-14',
      actorId: 'admin',
      actor: 'College Administrator',
      action: 'Directory entry verified: Dr. A. Sharma',
      targetId: 'dir-1',
      at: '2026-09-01T09:00:00.000Z',
    },
    {
      id: 'aud-15',
      actorId: 'admin',
      actor: 'College Administrator',
      action: 'Directory entry verified: Dr. S. Kapoor',
      targetId: 'dir-3',
      at: '2026-09-01T09:05:00.000Z',
    },
    {
      id: 'aud-16',
      actorId: 'squad',
      actor: 'Dr. A. Sharma',
      action: 'Case status changed: Escalated to Committee',
      targetId: 'ARMS-2026-0084',
      at: '2026-09-03T11:00:00.000Z',
    },
    {
      id: 'aud-17',
      actorId: 'committee',
      actor: 'Dr. S. Kapoor',
      action: 'Case status changed: Closed',
      targetId: 'ARMS-2026-0084',
      at: '2026-09-12T15:00:00.000Z',
    },
    {
      id: 'aud-18',
      actorId: 'system',
      actor: 'ARMS',
      action: 'Automated deadline check completed',
      targetId: 'system',
      at: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'aud-19',
      actorId: 'admin',
      actor: 'College Administrator',
      action: 'Active directory roster synchronised',
      targetId: 'directory',
      at: '2026-10-05T09:30:00.000Z',
    },
    {
      id: 'aud-20',
      actorId: 'system',
      actor: 'ARMS',
      action: 'Security audit: Session storage verified',
      targetId: 'system',
      at: '2026-10-10T00:00:00.000Z',
    },
    {
      id: 'aud-21',
      actorId: 'oversight',
      actor: 'Demo Registrar / DoSA',
      action: 'Dashboard oversight summary viewed',
      targetId: 'dashboard',
      at: '2026-10-15T11:30:00.000Z',
    },
    {
      id: 'aud-22',
      actorId: 'system',
      actor: 'ARMS',
      action: 'Approaching deadline alert evaluated for ARMS-2026-0142',
      targetId: 'ARMS-2026-0142',
      at: '2026-10-18T00:00:00.000Z',
    },
  ];

  const notifications = [
    {
      id: 'notif-1',
      recipientId: 'somik',
      message: 'ARMS-2026-0151: received: Acknowledged.',
      targetId: 'ARMS-2026-0151',
      at: '2026-09-18T21:30:00.000Z',
      read: true,
    },
    {
      id: 'notif-2',
      recipientId: 'somik',
      message: 'ARMS-2026-0142: status updated to Under Investigation.',
      targetId: 'ARMS-2026-0142',
      at: '2026-09-16T10:00:00.000Z',
      read: false,
    },
    {
      id: 'notif-3',
      recipientId: 'squad',
      message: 'ARMS-2026-0151 needs initial enquiry review.',
      targetId: 'ARMS-2026-0151',
      at: '2026-09-18T21:30:00.000Z',
      read: false,
    },
    {
      id: 'notif-4',
      recipientId: 'admin',
      message: 'A signed undertaking for Aman Verma (2026-27) needs verification.',
      targetId: 'ut-aman-2026',
      at: '2026-09-20T10:00:00.000Z',
      read: false,
    },
  ];

  return {
    state: {
      users,
      directory,
      cases,
      undertakings,
      references,
      audit,
      notifications,
      requests: [],
    },
  };
}
