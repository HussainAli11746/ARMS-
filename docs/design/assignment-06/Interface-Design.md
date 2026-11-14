# Assignment 7: Interface design

## 1. Screen map

The three selected use cases need five main screens. The wireframes show the fields, actions, feedback and navigation at a low level of detail. They are design references, not screenshots of a finished system.

| Screen | Use case | Main content and action | Next screen |
| --- | --- | --- | --- |
| [01 Named report](diagrams/interfaces/UI-Wireframe-01.png) | UC-003 | Incident date/time, location, category, involved people if known, description, optional evidence, confirmation check. Submit. | Submission confirmation |
| [02 Report confirmation](diagrams/interfaces/UI-Wireframe-02.png) | UC-003 | Case ID, current status, confirmation that the report was saved. | Own case status or dashboard |
| [03 Case review and update](diagrams/interfaces/UI-Wireframe-03.png) | UC-007 | Restricted case summary and history, permitted next status, required action note. Save or reopen when allowed. | Updated case details |
| [04 Undertaking upload](diagrams/interfaces/UI-Wireframe-04.png) | UC-011 | Student and session, signed PDF picker, declaration checkbox, current status. Submit or resubmit. | Pending verification status |
| [05 Administrator review](diagrams/interfaces/UI-Wireframe-05.png) | UC-011 | Protected PDF preview, student/session, accept, or reject with required reason. | Accepted/Verified or Rejected status |

The shared navigation contains Dashboard, Report an incident, Cases, Undertaking and Directory. A student sees only their own named cases. Squad and Committee members use the case workspace. An administrator reviews undertakings. The design does not expose protected actions merely because a browser displays a button; the server checks permissions for every request.

## 2. Field validation and messages

| Screen | Condition | Message shown to the user | Behaviour |
| --- | --- | --- | --- |
| Named report | Required category or description is blank | "Select a category and describe what happened." | Keep entered values; do not submit. |
| Named report | Optional evidence is not PDF, JPG or PNG, or exceeds 10 MB | "This file cannot be attached. Use PDF, JPG or PNG up to 10 MB." | Remove only the attachment; allow the report without it. |
| Named report | Save fails | "The report was not saved. Please try again." | Do not show a case ID. |
| Case update | Action note is blank | "Add a finding or action note before saving." | Do not change status. |
| Case update | Selected transition is not permitted | "This status change is not allowed from the current state." | Reload permitted statuses and preserve the note. |
| Case update | User lacks case permission | "You do not have permission to update this case." | Return to case list; do not reveal restricted details. |
| Case update | Case is closed | "A Committee member must enter a reason to reopen this case." | Hide ordinary update action. |
| Undertaking | No file or a non-PDF file | "Upload the signed undertaking as a PDF." | Do not submit. |
| Undertaking | Current session already accepted | "An undertaking for this session has already been verified." | Show read-only accepted record. |
| Administrator review | Reject selected without a reason | "Enter a reason before rejecting the undertaking." | Do not change status. |

The date and time fields support the detail requested in UC-003, but the UI accepts an approximate incident time when exact time is unknown. The interface should identify mandatory fields clearly and show errors next to the affected field. Confirmation messages should state the saved status, not imply that a handler has finished reviewing the case.

## 3. Software interface contracts

The routes below are the proposed API contract. All protected routes require an authenticated session and return JSON except the upload and download routes. `actorId` and role come from the session; clients cannot send them as trusted inputs. Error bodies use `{ code, message, fieldErrors? }`. A repeated submission with the same idempotency key returns the original success response.

| Interface / operation | Input | Success output | Relevant errors |
| --- | --- | --- | --- |
| `IAuth / IRoleAccess.getSession()` via `GET /api/session` | Session cookie | `{ userId, role, name }` | `401 UNAUTHENTICATED` |
| `IReportSubmission.submitNamed()` via `POST /api/cases` | `{ mode:"named", category, description, incidentAt?, location?, involvedPeople? }`, optional evidence upload token, idempotency key | `201 { caseId, status:"Acknowledged", createdAt }` | `401`, `403`, `422 VALIDATION_ERROR`, `503 SAVE_UNAVAILABLE` |
| `ICaseCreation.create()` | Internal validated report, reporter ID and optional evidence token | New `Case`, initial history entry and selected authorized body | Failure if no permitted active contact or data store is unavailable |
| `IFileStorage.stageEvidence()` via `POST /api/evidence` | One PDF/JPG/PNG file, max 10 MB | `201 { uploadToken, filename }` | `413 FILE_TOO_LARGE`, `415 FILE_TYPE_NOT_ALLOWED`, `503 STORAGE_UNAVAILABLE` |
| `ICaseWorkflow.getCase()` via `GET /api/cases/{caseId}` | Case ID | Authorized case summary and history; reporter view omits handler-only notes | `401`, `403`, `404` |
| `ICaseWorkflow.permittedTransitions()` via `GET /api/cases/{caseId}/transitions` | Case ID | `{ currentStatus, allowedStatuses, canReopen }` | `401`, `403`, `404` |
| `ICaseWorkflow.updateStatus()` via `POST /api/cases/{caseId}/status` | `{ nextStatus, actionNote, expectedVersion }` | `200 { caseId, status, version, historyId }` | `403`, `404`, `409 INVALID_TRANSITION` or `STALE_VERSION`, `422` |
| `ICaseWorkflow.reopen()` via `POST /api/cases/{caseId}/reopen` | `{ reason, expectedVersion }` | `200 { caseId, status:"Under Investigation", version }` | `403`, `404`, `409`, `422 REASON_REQUIRED` |
| `IUndertaking.submit()` via `POST /api/undertakings` | `{ studentId, semester, guardianName?, declarationAccepted, pdfUploadToken }` | `201 { undertakingId, status:"Pending Verification" }` | `403`, `409 ALREADY_VERIFIED`, `422`, `415` |
| `IUndertaking.review()` via `POST /api/undertakings/{id}/reviews` | `{ decision:"accept"|"reject", reason?, expectedVersion }` | `200 { undertakingId, status, reviewId }` | `403`, `404`, `409`, `422 REASON_REQUIRED` |
| `IDirectoryQuery.activeMembers()` via `GET /api/directory?body=...` | Authorized body filter | Active member contact records | `401`, `403` |
| `IRoutingDirectory.initialBodyFor()` | Internal case category and active directory records | Selected Squad, Committee or administrator review body | `NO_ACTIVE_CONTACT` for manual administrator handling |
| `INotification.enqueue()` | Internal `{ recipientId, type, caseId?, undertakingId? }` | Notification ID and queued status | Queue failure recorded for retry; saved case or undertaking remains committed |
| `INotificationQuery.listMine()` via `GET /api/notifications` | Authenticated session | Notifications permitted for that recipient | `401`, `403` |
| `IOversightReporting.summary()` via `GET /api/oversight/summary` | Authorized oversight session and filters | Case counts, statuses and overdue totals | `401`, `403` |
| `IAuditLog.record()` | Internal `{ actorId, action, targetType, targetId, at }` | Stored audit ID | Transaction fails if mandatory audit record cannot be stored |

The API names express the component contracts. The current browser prototype has no server API yet. The team should keep this distinction clear in the demonstration.

## 4. Component communication

The browser calls the API layer. The API checks the session and required permission, then invokes one application operation. Report submission calls private file validation where evidence exists, asks Case Workflow for the category-based initial body using active directory entries, saves the case and audit data, then queues notifications. A case status update calls `CaseStatusValidator` before saving the case and history. Undertaking review writes a verification record and changes the undertaking status in the same transaction. None of these operations accepts a client-supplied actor identity as proof of authorization.
