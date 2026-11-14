# ARMS — Anti-Ragging Management System

An institutional compliance, reporting, and case-lifecycle management platform designed to eliminate ragging, ensure accountability, and streamline anti-ragging compliance workflows.

---

## 🚀 Key Features

* **Authenticated & Anonymous Reporting (UC-003):**
  * Support for named and anonymous incident reporting.
  * Captures date, time, location, persons involved, and detailed descriptions.
  * Category-based automatic routing (e.g., Physical Intimidation routes to Squad; Online Harassment routes to Committee).
  * Secure evidence attachment upload with magic-byte validation (verifying PDF, PNG, and JPEG binary signatures).

* **8-Stage Case Lifecycle Progression (UC-007):**
  * Strict Finite State Machine (FSM) enforcement:
    `Reported` → `Acknowledged` → `Under Investigation` → `Findings Recorded` → `Escalated to Committee` → `Committee Decision Recorded` → `Action Taken` → `Closed`
  * Role-gated actions (Anti-Ragging Squad vs. Anti-Ragging Committee).
  * Reopening closed cases requires authorized Committee justification.

* **Dual-Signee Undertaking Verification (UC-011):**
  * Dual-signee workflow requiring both student and parent/guardian verification.
  * College Administrator review with mandatory rejection reasons and resubmission tracking.
  * Full version audit history preserved across submissions.

* **Institutional Governance & Compliance Metrics (FR-024 / FR-025):**
  * Registrar and DoSA executive dashboard with real-time resolution metrics, open case distribution, and compliance indicators.
  * Immutable system-wide audit logging tracking all administrative, status, and file operations.

* **Role-Based Access Control (RBAC):**
  * 6 distinct roles: `Student`, `Parent / Guardian`, `Anti-Ragging Squad`, `Anti-Ragging Committee`, `Administrator`, and `Registrar / DoSA`.
  * Strict authorization boundaries ensuring complete privacy and isolation of sensitive case records.

---

## 🛠️ Tech Stack

* **Frontend:** [React 19](https://react.dev/), [vinext](https://github.com/cloudflare/vinext) (Vite-based Next.js App Router / RSC runtime), [Tailwind CSS v4](https://tailwindcss.com/)
* **UI Components:** [shadcn/ui](https://ui.shadcn.com/), [@base-ui/react](https://base-ui.com/), [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/)
* **Backend:** Node.js (>=22.13), Next.js App Router API Handlers, Cloudflare Workers runtime
* **Database & Storage:**
  * Cloudflare D1 (SQLite) relational persistence schema
  * Automated local JSON snapshot fallback for zero-dependency local execution
* **Tooling & Quality:** [TypeScript 5.9](https://www.typescriptlang.org/), [oxlint](https://oxc-project.github.io/), [oxfmt](https://oxc-project.github.io/)

---

## 🏁 Getting Started

### Prerequisites
* Node.js 22.13.0 or newer
* npm 9 or newer

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/ARMS.git
   cd ARMS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open the application:
   ```
   http://localhost:3000
   ```

---

## 👥 Demo Accounts & Credentials

The application provides quick-login buttons on the login screen or manual credentials:

| Role | Name | Email | Password | Primary Showcase |
| --- | --- | --- | --- | --- |
| **Student** | Somik Jain | `somik@arms.test` | `ArmsDemo2026!` | UC-003 Report Submission, UC-011 Undertaking |
| **Student** | Aman Verma | `aman@arms.test` | `ArmsDemo2026!` | Multi-tenant isolation & access boundary testing |
| **Parent** | Demo Guardian | `guardian@arms.test` | `ArmsDemo2026!` | Linked guardian undertaking confirmation |
| **Squad** | Dr. A. Sharma | `squad@arms.test` | `ArmsDemo2026!` | UC-007 Investigation, findings, squad escalation |
| **Committee** | Dr. S. Kapoor | `committee@arms.test` | `ArmsDemo2026!` | Committee decision recording, case closure & reopening |
| **Administrator** | College Admin | `admin@arms.test` | `ArmsDemo2026!` | UC-011 Undertaking review (reject/accept), user management |
| **Registrar / DoSA** | Dr. Registrar | `oversight@arms.test` | `ArmsDemo2026!` | Executive oversight, resolution metrics & audit trail |

---

## 🧪 Automated Testing & Verification

Run the test suites to verify backend domain logic and HTTP endpoints:

* **Backend Test Suite (12 test categories):**
  ```bash
  npx tsx scripts/test-backend.ts
  ```

* **Live End-to-End Verification:**
  ```bash
  npx tsx scripts/verify-website.ts
  ```

* **Type Safety & Linting:**
  ```bash
  npx oxlint app/page.tsx lib/arms/*.ts app/api/**/*.ts scripts/*.ts
  npx tsc --noEmit
  ```

---

## 📄 License

This project is licensed under the MIT License.
