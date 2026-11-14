# ARMS Prototype — Team Demonstration & Sharing Guide

This package contains the complete Anti-Ragging Management System (ARMS) prototype prepared for SWE viva demonstration. It implements the key assignment workflows (UC-003, UC-007, UC-011) with institutional authentication, category-based routing, case lifecycle progression, dual-signee undertaking verification with full revision history, role-based authorization, and durable SQLite persistence.

---

## 1. Quick Start (Run Locally)

### Prerequisites
- Node.js 20 or newer
- npm 9 or newer

### Steps
1. Open a terminal in the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
4. Open the prototype in your browser:
   ```
   http://localhost:3000
   ```

---

## 2. Demo User Accounts & Credentials

You can log in either by clicking any **Quick Demo Account** button on the login screen, or by entering the email and password manually:

| Role | Name | Email | User ID | Password | Key Viva Walkthrough |
| --- | --- | --- | --- | --- | --- |
| **Student** | Somik Jain | `somik@arms.test` | `somik` | `ArmsDemo2026!` | UC-003 submit named report with evidence; UC-011 submit signed undertaking |
| **Student** | Aman Verma | `aman@arms.test` | `aman` | `ArmsDemo2026!` | Peer student testing authorization boundaries & isolation |
| **Parent / Guardian** | Demo Guardian | `guardian@arms.test` | `guardian` | `ArmsDemo2026!` | Linked to student Somik |
| **Anti-Ragging Squad** | Dr. A. Sharma | `squad@arms.test` | `squad` | `ArmsDemo2026!` | UC-007 investigate physical intimidation case, record findings, escalate |
| **Squad Member** | Mr. R. Meena | `squad2@arms.test` | `squad2` | `ArmsDemo2026!` | Squad co-investigator |
| **Committee Chair** | Dr. S. Kapoor | `committee@arms.test` | `committee` | `ArmsDemo2026!` | Direct assignment for online harassment; record decision, close & reopen |
| **Committee Member** | Ms. P. Nair | `committee2@arms.test` | `committee2` | `ArmsDemo2026!` | Committee co-member |
| **College Administrator**| College Admin | `admin@arms.test` | `admin` | `ArmsDemo2026!` | UC-011 review undertaking, reject with reason, accept resubmitted V2; user admin |
| **Registrar / DoSA** | Dr. Registrar | `oversight@arms.test` | `oversight` | `ArmsDemo2026!` | FR-024 / FR-025 Institutional oversight, compliance metrics & audit trail |

---

## 3. Automated Verification Tests

You can run automated test scripts to verify backend logic and end-to-end HTTP flows:

- **Backend Logic Test Suite (12 tests)**:
  ```bash
  npx tsx scripts/test-backend.ts
  ```

- **Live HTTP Website Verification (while `npm run dev` is running)**:
  ```bash
  npx tsx scripts/verify-website.ts
  ```

- **Linting & Type Safety**:
  ```bash
  npx oxlint app/page.tsx lib/arms/*.ts app/api/**/*.ts scripts/*.ts
  npx tsc --noEmit
  ```

---

## 4. Workflows Implemented

1. **UC-003: Submit Named Report**
   - Reporter identity is authenticated from the active session.
   - Incident date, time, location, witness notes, and category-based initial routing (Squad for physical intimidation; Committee for online harassment).
   - Optional file evidence upload with magic-byte validation and secure isolated storage.
   - Immediate Acknowledged notification and case-history timeline entry.

2. **UC-007: Update Case Status & Lifecycle**
   - Authorized role-enforced transitions:
     - Squad: `Acknowledged` -> `Under Investigation` -> `Escalated to Committee`
     - Committee: `Under Investigation` -> `Committee Decision Recorded` -> `Closed`
   - Reopening closed cases requires an authorized Committee role and an explicit justification reason.

3. **UC-011: Submit Anti-Ragging Undertaking**
   - Dual signee verification (student + parent/guardian confirmation).
   - Administrator review: Rejection requires a mandatory rejection reason; acceptance requires verified review.
   - Full version history preserved: V1 remains auditable, student can submit V2, and administrator accepts V2.
   - Strict authorization on document download (unauthorized students receive HTTP 403).
