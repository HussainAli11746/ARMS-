# ARMS — Anti-Ragging Management System

An institutional compliance, reporting, and case-lifecycle management platform designed to eliminate ragging, ensure accountability, and streamline anti-ragging compliance workflows.

---

## Project Structure & File Reference

### `app/` — Frontend & API Layer

#### `app/page.tsx`
The **entire frontend** of the application in a single React file. Contains:
- All screen render functions: `renderReportScreen`, `renderCasesScreen`, `renderUndertakingScreen`, `renderDirectoryScreen`, `renderAuditScreen`, `renderUsersScreen`, `renderReportsScreen`, `renderReferenceScreen`
- All form handlers: `submitReport`, `handleStatusTransition`, `handleReopenCase`, `submitUndertaking`, `reviewUndertaking`, etc.
- State management via `useState` (form values, snapshot, logged-in user)
- Initial data fetch via `useEffect` calling `/api/arms/snapshot`
- After every action, calls `setSnapshot()` to refresh the UI with fresh server data

#### `app/layout.tsx`
HTML shell of the application. Sets the page `<title>` as *"ARMS Prototype | LNMIIT"*, imports global CSS, and wraps all pages in the root `<html>` and `<body>` tags.

#### `app/globals.css`
All global styles for the application using Tailwind CSS v4. Defines layout, status pill colors, section titles, form styling, and responsive design.

---

### `app/api/` — REST API Routes (Backend HTTP Endpoints)

Each `route.ts` file inside `app/api/` is one HTTP endpoint. They all follow the same pattern:
1. Identify the signed-in user via `requireAuth()` or `getSessionUser()`
2. Read request body / form data
3. Call business logic in `service.ts` via `applyCommand()`
4. Save updated state via `saveState()`
5. Return `publicSnapshot()` filtered for the current user

#### `app/api/auth/login/route.ts`
**POST /api/auth/login** — Handles user login.
- Accepts `{ email, password }` or `{ demoUserId }` (shortcut for viva demo)
- Calls `verifyCredentials()` to check password hash
- On success: creates a session token, sets it as an `HttpOnly` cookie (`arms_session`), returns `{ ok, user, token }`
- On failure: returns HTTP 401

#### `app/api/auth/logout/route.ts`
**POST /api/auth/logout** — Handles user logout.
- Reads the session token from cookie or Authorization header
- Calls `deleteSession()` to remove it from memory
- Clears the `arms_session` cookie by setting `maxAge: 0`

#### `app/api/auth/session/route.ts`
**GET /api/auth/session** — Checks if the current request has a valid session.
- Calls `getSessionUser()` and returns `{ authenticated: true/false, user }`
- Used by the frontend on page load to restore the logged-in user

#### `app/api/arms/command/route.ts`
**POST /api/arms/command** — Central command bus for all data-mutating actions.
- Authenticates the user via `requireAuth()`
- Checks optimistic concurrency: if `revision` is provided and doesn't match, returns HTTP 409 `VERSION_CONFLICT`
- Calls `applyCommand(state, actor, body)` in `service.ts`
- Saves state and returns a fresh `publicSnapshot`
- Used for: status updates, user management, directory changes, notifications, etc.

#### `app/api/arms/snapshot/route.ts`
**GET /api/arms/snapshot** — Returns the full application state filtered for the logged-in user.
- Authenticates the user
- Calls `generateDeadlineNotifications()` to auto-generate overdue alerts if needed
- Returns `publicSnapshot(state, actor, version)` — only data the user is permitted to see

#### `app/api/cases/route.ts`
**POST /api/cases** — Submits a new incident report (UC-003).
- Accepts `multipart/form-data` (with optional evidence file) or JSON
- Supports both named (authenticated) and anonymous reporting
- Validates uploaded file bytes using `validateFileBytes()` from `upload.ts`
- Calls `applyCommand` with action `'report'` → `submitNamedOrAnonymousReport()` in `service.ts`
- Saves the case record and evidence file atomically in a SQLite transaction

#### `app/api/cases/[caseId]/route.ts`
**GET /api/cases/:caseId** — Returns a single case visible to the requesting user.
- Delegates to `getCaseResponse()` in `api-contracts.ts`
- Returns HTTP 404 if the case doesn't exist or the user is not authorized to view it

#### `app/api/cases/[caseId]/status/route.ts`
**POST /api/cases/:caseId/status** — Updates the status of a case (UC-007).
- Delegates to `postCaseAction(request, caseId, 'status')` in `api-contracts.ts`
- Internally calls `applyCommand` with action `'status'` → `updateCaseStatus()` in `service.ts`
- Enforces FSM transition rules (only the allowed next status is accepted)

#### `app/api/cases/[caseId]/reopen/route.ts`
**POST /api/cases/:caseId/reopen** — Reopens a closed case.
- Delegates to `postCaseAction(request, caseId, 'reopen')` in `api-contracts.ts`
- Only Committee role is permitted; a reason is mandatory
- Calls `reopenClosedCase()` in `service.ts`

#### `app/api/cases/[caseId]/transitions/route.ts`
**GET /api/cases/:caseId/transitions** — Returns the allowed next status for a case.
- Delegates to `getCaseResponse()` with `transitionsOnly=true`
- Returns `{ currentStatus, allowedStatuses: [nextStatus], canReopen }`

#### `app/api/cases/[caseId]/evidence/route.ts`
**POST /api/cases/:caseId/evidence** — Attaches additional evidence to an existing case.
- Validates the uploaded file (PDF/PNG/JPEG, max 10 MB)
- Calls `applyCommand` with action `'evidence'` → `attachEvidenceToCase()` in `service.ts`
- Checks the user is authorized to add evidence to this case

#### `app/api/undertakings/route.ts`
**POST /api/undertakings** — Submits an anti-ragging undertaking PDF (UC-011).
- Requires authentication
- Accepts `multipart/form-data` with a PDF file, `session`, `guardianName`, `confirmed`
- Validates that the uploaded file is a genuine PDF using magic-byte check
- Calls `applyCommand` with action `'undertaking'` → `submitStudentUndertaking()` in `service.ts`

#### `app/api/undertakings/[undertakingId]/reviews/route.ts`
**POST /api/undertakings/:undertakingId/reviews** — Administrator accepts or rejects an undertaking.
- Delegates to `postUndertakingReview()` in `api-contracts.ts`
- Decision values `'accept'` / `'reject'` are mapped to full labels internally
- Rejection requires a mandatory reason; calls `reviewStudentUndertaking()` in `service.ts`

#### `app/api/files/[fileId]/route.ts`
**GET /api/files/:fileId** — Serves a stored file (evidence or undertaking PDF).
- Checks the user is authorized to download this specific file
- Returns the raw file bytes with the correct `Content-Type` header
- Unauthorized access returns HTTP 403

#### `app/api/notifications/route.ts`
**GET /api/notifications** — Returns all notifications for the logged-in user.
- Authenticates the user
- Filters `state.notifications` to only those where `recipientId === actor.id`

#### `app/api/directory/route.ts`
**GET /api/directory** — Returns active committee/squad directory members.
- Requires authentication
- Accepts optional `?body=` query parameter to filter by body name
- Returns only active directory entries

#### `app/api/reports/cases/route.ts`
**GET /api/reports/cases** — Case summary and CSV export for oversight roles.
- Only accessible to `administrator`, `oversight`, and `committee` roles (HTTP 403 otherwise)
- Returns `{ summary: { totalCases, activeCases, closedCases, byCategory, byStatus, byBody }, cases }`
- With `?format=csv`: returns a downloadable `arms_cases_report.csv` file

#### `app/api/oversight/summary/route.ts`
**GET /api/oversight/summary** — Executive dashboard endpoint for the Registrar/DoSA.
- Re-exports the same `GET` handler from `reports/cases/route.ts`
- Same data, different URL — matches the interface design specification

#### `app/api/session/route.ts`
**GET /api/session** — Alias for the session check endpoint.
- Re-exports from `auth/session/route.ts`

#### `app/api/admin/reset/route.ts`
**POST /api/admin/reset** — Resets the database back to seed data.
- Used during development and testing to restore demo accounts and sample cases
- Calls `resetDatabase()` from `db.ts`

---

### `lib/arms/` — Backend Business Logic (Server-Only)

#### `lib/arms/model.ts`
The **data type definitions** — think of this as the header file. Defines:
- `Role` — 6 roles: `student`, `parent`, `squad`, `committee`, `administrator`, `oversight`
- `CaseStatus` — 8 lifecycle stages (Reported → Closed)
- `Category` — 4 incident categories (Verbal, Physical, Online, Other)
- `User`, `CaseRecord`, `Attachment`, `History`, `Undertaking`, `Review`, `Audit`, `Notification`, `DirectoryEntry`, `Reference` — all data shapes
- `State` — the complete application data (users, cases, undertakings, audit, notifications, etc.)
- `Snapshot` — filtered view of State sent to the browser
- `nextStatus(user, record)` — returns the one allowed next case status or `null`
- `canViewCase(user, record)` — visibility check per role
- `canReviewUndertaking(user)` — only Administrator may review undertakings
- `deadlineState(record)` — returns `Overdue` / `Due soon` / `On track` / `Closed`
- `anonymousReporter` — placeholder actor used when no session exists for anonymous reports

#### `lib/arms/service.ts`
The **business rules** — the most important file. Entry point is:
```
applyCommand(state, actor, command, attachment?)
```
A `switch` on `command.action` routes to the named function:

| Action | Function | Use Case |
|---|---|---|
| `report` | `submitNamedOrAnonymousReport` | UC-003 |
| `status` | `updateCaseStatus` | UC-007 |
| `reopen` | `reopenClosedCase` | UC-007 |
| `evidence` | `attachEvidenceToCase` | Evidence upload |
| `undertaking` | `submitStudentUndertaking` | UC-011 |
| `review` | `reviewStudentUndertaking` | UC-011 Admin |
| `notify-read` | `markNotificationAsRead` | Notifications |
| `role` | `updateUserAccount` | User management |
| `directory` | `saveDirectoryMember` | Directory |
| and more... | | |

Also contains:
- `publicSnapshot(state, actor, version)` — filters State to only what the user may see
- `recordAuditEvent()` — appends to the immutable audit log
- `addNotification()` — sends an in-app notification to a recipient
- `notifyHandlingBody()` — notifies all active members of a body (squad/committee)
- `generateDeadlineNotifications()` — checks overdue cases and auto-generates alerts
- `DomainError` class — custom error with HTTP status code (`403`, `401`, `422`, `409`, etc.)

#### `lib/arms/db.ts`
**State management and credential handling.** Acts as an in-memory cache layer on top of SQLite.

- `getState()` — returns a deep clone of current state + version number
- `saveState(state, expectedVersion)` — increments version, writes to SQLite via `storage.ts`
- `verifyCredentials(email, password)` — PBKDF2 hash comparison (100,000 iterations, SHA-256, random salt)
- `createSession(userId)` — generates a 64-char random token; stores its SHA-256 hash in memory with 24h expiry
- `getUserBySession(token)` — hashes the token, looks it up, checks expiry, returns `User`
- `deleteSession(token)` — removes the session on logout
- `getFile(fileId)` / `saveFile(file)` — file storage delegation to `storage.ts`
- `resetDatabase()` — wipes and re-seeds all data (used in tests and dev reset)

#### `lib/arms/storage.ts`
**SQLite persistence layer** using Node's built-in `DatabaseSync` (no extra package needed).

Creates and manages these tables:
`users`, `cases`, `case_history`, `evidence`, `undertakings`, `submissions`, `reviews`, `directory`, `audit`, `notifications`, `punishment_reference`, `requests`, `files`

Key functions:
- `writeState(state, version, files)` — saves everything in a single **SQLite transaction** (COMMIT on success, ROLLBACK on failure — prevents partial/corrupt saves)
- `readState()` — reads all tables and reconstructs the full `State` object
- `writeFile(file)` / `readFile(id)` — stores/retrieves raw file bytes as BLOBs
- `clearSavedData()` — wipes the database for reset/testing

#### `lib/arms/auth.ts`
**Session extraction from HTTP requests.**

- `getSessionUser(request)` — checks `Authorization: Bearer <token>` header first, then `arms_session` cookie; returns `User | null`
- `requireAuth(request)` — calls `getSessionUser`, throws `DomainError(401)` if no valid session found; used by every protected API route

#### `lib/arms/upload.ts`
**File format validation using magic bytes** (actual binary content, not file extension).

- `validateFileBytes(name, buffer)` — checks the raw binary header to confirm the file is genuinely:
  - **PDF**: starts with `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`) and contains `%%EOF` near the end
  - **PNG**: 8-byte PNG signature + `IHDR` chunk at offset 12
  - **JPEG**: starts with `0xFF 0xD8 0xFF` and ends with `0xFF 0xD9` (EOI marker)
- Throws `DomainError(413)` if file exceeds **10 MB**
- Throws `DomainError(415)` if file format is not PDF, PNG, or JPEG
- Prevents MIME-type spoofing (renaming `.exe` to `.pdf` won't pass this check)

#### `lib/arms/seed.ts`
**Demo data** — seed users, sample cases, committee directory, punishment reference table, and undertaking records loaded on first startup. Mostly static data, not application logic.

#### `lib/arms/api-contracts.ts`
**Named REST endpoint helpers** — translates the design specification's endpoint naming to the same underlying business functions without duplicating logic.

- `getCaseResponse(request, caseId, transitionsOnly)` — shared handler for `GET /cases/:id` and `GET /cases/:id/transitions`
- `postCaseAction(request, caseId, action)` — shared handler for `/status` and `/reopen` endpoints; delegates to the central command route
- `postUndertakingReview(request, undertakingId)` — shared handler for the reviews endpoint; normalizes `accept`/`reject` shorthand to full decision labels
- `errorResponse(error)` — converts `DomainError` or generic errors into a consistent `{ ok: false, error }` JSON response

---

### `scripts/` — Test & Verification Scripts

#### `scripts/test-backend.ts`
**12 backend unit tests** covering: authentication, UC-003 report submission, UC-007 case lifecycle, role isolation, file magic-byte validation, undertaking workflows, audit logging, and anonymous reporting. Run with:
```bash
npm test
```

#### `scripts/test-storage.ts`
**SQLite layer tests** — verifies JSON import, file storage, transaction rollback on failure, and review permissions in an isolated temp folder. Run with:
```bash
npm run test:storage
```

#### `scripts/test-contracts.ts`
**End-to-end HTTP tests** — exercises the named REST routes (status, reopen, reviews) on a live test server and verifies correct responses and HTTP status codes. Run with:
```bash
npm run test:contracts
```

#### `scripts/verify-website.ts`
**Live smoke tests** — sends HTTP requests to the running dev server to verify login, session, case submission, and snapshot endpoints respond correctly. Run with the dev server active:
```bash
npm run test:website
```

#### `scripts/seed-local.mjs`
Helper script to seed the local database with demo data manually if needed.

#### `scripts/sample.pdf`
A minimal valid PDF file used as test evidence in backend test suites.

---

### Root Configuration Files

| File | Purpose |
|---|---|
| `package.json` | Project name (`arms`), Node.js version requirement (>=22.13), npm scripts (`dev`, `build`, `test`, `lint`, etc.), and all dependencies |
| `tsconfig.json` | TypeScript compiler configuration — strict type checking, path aliases (`@/` → project root) |
| `vite.config.ts` | Vite bundler configuration — sets up Tailwind CSS PostCSS plugin, `vinext` framework plugin, and Cloudflare Workers runtime plugin |
| `next.config.ts` | Next.js configuration (minimal — framework defaults apply) |
| `README.md` | This file |
| `TEAM_SHARING.md` | Team demo guide — all credentials, demo accounts, and quick-start instructions |
| `PROJECT_ROADMAP.md` | Assignment alignment notes — what each assignment phase covers and what remains for production |
| `VIVA_CODE_GUIDE.md` | Viva preparation guide — file reading order, requirement-to-function map, JS/React syntax reference |
| `LOCAL_DEMO_NOTES.md` | Notes for running the demo locally — environment tips and known limitations |

---

### `docs/` — Design Documentation

#### `docs/design/assignment-06/`
Full set of Assignment 6 (Software Design) deliverables:
- `Architectural-Design.md` — system architecture document
- `Component-Level-Design.md` — component breakdown and responsibilities
- `Data-Class-Design.md` — data class design with attributes
- `Interface-Design.md` — UI wireframes and API interface descriptions
- `Design-Traceability.md` — maps design decisions back to requirements
- `README.md` — assignment submission summary
- `diagrams/` — SVG and PNG architectural, component, and class diagrams
- `diagrams/interfaces/` — UI wireframe images (5 screens)

---

### `migrations/` *(removed in latest version)*
Previously contained `0001_arms.sql` for Cloudflare D1 schema. The current version uses Node's built-in SQLite (`storage.ts`) with auto-created tables — no migration files needed for local development.
