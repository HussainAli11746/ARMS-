# Local demo changes and file map

The local app keeps the ARMS features from the updated GitHub source. This cleanup changes infrastructure, removes unused starter code and fixes a mobile CSS selector. It does not certify complete SRS compliance.

The later readability pass splits the large command dispatcher into eleven named operation functions and the page markup into nine named screen functions. It also removes unnecessary useMemo wrappers, names two inline render helpers, and shares undertaking-review permissions between the UI and server. See VIVA_CODE_GUIDE.md for the current function map.

## File responsibilities

| Files | Responsibility and review decision |
| --- | --- |
| app/page.tsx | All application screens and form handlers. Retained to avoid a large UI rewrite immediately before evaluation. |
| app/globals.css | Existing visual layout; corrected field-grid mobile selector. |
| app/layout.tsx | Page metadata and root HTML; removed external font setup because the existing design uses Arial. |
| lib/arms/model.ts | Domain types, case visibility and allowed transitions. Retained. |
| lib/arms/seed.ts | Sample users, cases, directory, references and documents. Retained. |
| lib/arms/service.ts | Business rules, status changes, undertakings, notifications and audit. Retained. |
| lib/arms/auth.ts | Cookie and bearer session authentication. Retained for browser and test clients. |
| lib/arms/db.ts | Local records, files, credentials and sessions. Removed Cloudflare D1 synchronization and unused database compatibility shim; retained version checks and delegates SQLite persistence to storage.ts. |
| lib/arms/upload.ts | File size and format validation; now also supplies one shared uploaded-file check. |
| app/api/auth/login/route.ts | Password/demo login and session cookie. Removed cloud initialization. |
| app/api/auth/logout/route.ts | Ends the cookie/bearer session. Retained. |
| app/api/auth/session/route.ts | Reads session identity. Retained. |
| app/api/arms/snapshot/route.ts | Authorized data and deadline notifications; reads state once and reports save errors. |
| app/api/arms/command/route.ts | Validates and saves domain commands. Removed cloud initialization and an unused helper. |
| app/api/cases/route.ts | Report creation and optional evidence. Uses shared file check. |
| app/api/cases/[caseId]/evidence/route.ts | Handler evidence upload. Uses shared file check. |
| app/api/undertakings/route.ts | Signed PDF submission and resubmission. Uses shared file check. |
| app/api/files/[fileId]/route.ts | Authorized document access. Removed unused helper and cloud initialization. |
| app/api/reports/cases/route.ts | Reports and CSV download. Removed cloud initialization. |
| app/api/admin/reset/route.ts | Administrator-only sample-data reset. Retained. |
| scripts/test-backend.ts | Isolated business-logic checks. Retained. |
| scripts/verify-website.ts | Live HTTP workflow checks. Retained. |
| scripts/verify-persistence.ts | Restart checks with supplied record IDs. Retained. |
| vite.config.ts | Native local Vinext server and Tailwind. Cloudflare and hosting plugins removed. |
| package.json / package-lock.json | Local commands and dependencies. Unused starter widget packages and hosting packages removed from declared dependencies. |
| tsconfig.json | Existing type checks; cloud-specific types removed. |
| docs/design/ | Existing assignment design reference material retained. |

Unused components/ui, hooks/use-mobile.ts and lib/utils.ts were disconnected starter templates: no application or domain file imported them. Their supporting configuration was removed with them. Cloudflare seed SQL/script, Wrangler configuration and hosting metadata were removed because the demonstration now runs in Node with local SQLite.

## Required capabilities retained

FR-001 to FR-004: sign-in/out, access roles and administrator role changes.
FR-005 to FR-010: named/anonymous report modes, optional details, evidence, case IDs and classification.
FR-011 to FR-015: status workflow, history, own-case tracking, deadlines and committee closure/reopening.
FR-016 to FR-020: directory, undertaking submission/review, reference screen and in-app notifications.
FR-021 to FR-024: overview/report screens, report export, audit and directory maintenance.

Required checks remain: mandatory fields, permitted file formats and size, case permissions, valid transitions, reopening reasons, undertaking duplicates, resubmission history and stale versions.

## Verification

Type check and the existing backend suite passed. Live HTTP checks passed for login, report plus attachment, access restrictions, investigation/closure/reopen, undertaking rejection/resubmission/acceptance, historical downloads and corrupted file rejection. A server restart preserved the created case, uploaded evidence and two undertaking versions/reviews. The main student screens and the public anonymous form were checked in the browser; a complete cross-browser walkthrough has not been completed.

These checks are regression checks, not proof of every SRS condition. The prototype still uses simulated institutional accounts, in-app notifications and generalized punishment references. No official fine source has been supplied. The older form-only undertaking requirement and later signed-PDF design differ, while the undertaking review permissions now match the submitted administrator-only scenario.


## Alignment corrections

- Undertaking verification and access to all submitted undertakings are limited to the administrator; students/guardians retain access to their own records.
- The application name is Monitoring System. Other-category initial assignment is labelled Administrator review.
- storage.ts persists records, child histories/submissions/reviews and file bytes in SQLite. Writes use BEGIN/COMMIT/ROLLBACK; failed mandatory writes do not update the in-memory state.
- The database imports old JSON data on first initialization. It keeps JSON property payloads in SQL rows; it is a practical local relational implementation, not a fully normalized table-per-attribute schema.
- Named API endpoints for case retrieval, transitions, status, reopening, undertaking review, session, directory, notifications and oversight are available. The shared command endpoint remains for admin operations and compatibility. api-contracts.ts adapts requests to the existing named business functions.
- The UI uses named status/reopening/review routes. Evidence is uploaded with the report rather than using the proposed standalone staging-token endpoint.
- Login-free anonymous reporting is implemented through the public form; visitors receive confirmation without protected case data or a session. Institutional SSO, externally delivered notifications and an approved punishment reference remain unavailable. These limitations are visible rather than represented as completed integrations.

The final alignment checks passed: backend suite, live named-endpoint workflows, anonymous access restrictions, JSON migration, SQLite transaction rollback and post-restart case/file/undertaking persistence. Test data is isolated from the normal demo database.
