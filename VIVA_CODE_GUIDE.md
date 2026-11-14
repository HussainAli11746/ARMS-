# Reading and editing ARMS for the viva

Start with one requirement and follow its functions. You do not need to read the whole page file from top to bottom before you can understand a feature.

## The path followed by a user action

1. A render function in `app/page.tsx` displays the form or button.
2. A handler in the same file reads its values and sends an HTTP request using `fetch`.
3. A route in `app/api/` receives that request and identifies the signed-in user.
4. `applyCommand` in `lib/arms/service.ts` uses a switch to choose the business function.
5. That function validates the request and changes a copy of the records.
6. `saveState` in `lib/arms/db.ts` saves the changed records in a local SQLite transaction.
7. The route returns the updated permitted data. `setSnapshot` updates the screen.

The server performs permission checks even when a button is hidden. Otherwise someone could send a request directly to the API and bypass the screen.

## Open these files in this order

| File | What to understand |
| --- | --- |
| lib/arms/model.ts | Data types, roles, categories, permitted transitions and visibility. Types resemble C++ structs and type declarations. |
| lib/arms/service.ts | Actual requirement rules. Begin at applyCommand, then jump to the selected named function. |
| app/api/cases/route.ts | A complete example of receiving form data, checking the user, running business logic, saving and responding. |
| app/page.tsx | Forms, click handlers and screen functions. |
| lib/arms/db.ts | Saving/loading local records and managing demo credentials and sessions. |
| lib/arms/storage.ts | SQL tables, foreign keys, transactions and protected file bytes. Record properties are serialized in JSON columns; this is not a fully normalized SQL schema. |
| lib/arms/upload.ts | File format and size checks. |
| lib/arms/seed.ts | Starting sample records and accounts. Mostly data rather than application logic. |

## Requirement-to-function map

| Requirement | Screen / browser handler in app/page.tsx | Server function in service.ts unless stated |
| --- | --- | --- |
| Sign in / sign out | handleLogin / handleLogout | auth/login and auth/logout routes; db.verifyCredentials/createSession/deleteSession |
| Named or anonymous report | renderReportScreen / submitReport | submitNamedOrAnonymousReport |
| Attach initial evidence | submitReport | cases route; validateFileBytes in upload.ts |
| Search / filter cases | getFilteredCases / renderCasesScreen | publicSnapshot determines which cases reach the browser |
| Change case status | renderCaseActionControls / handleStatusTransition | updateCaseStatus; model.nextStatus lists allowed next steps |
| Reopen a closed case | handleReopenCase | reopenClosedCase |
| Add evidence later | handleAttachEvidence | attachEvidenceToCase through the case evidence route |
| Change category or deadline | handleUpdateCaseDetails | updateCaseCategoryAndDeadline |
| Assign a handling body | handleReassignCase | assignCaseToHandlingBody |
| Student/guardian undertaking | renderStudentUndertakingForm / submitUndertaking | submitStudentUndertaking |
| Verify/reject an undertaking | renderUndertakingScreen / reviewUndertaking | reviewStudentUndertaking |
| Directory maintenance | renderDirectoryScreen / handleAddDirectoryEntry / handleToggleDirectoryActive | saveDirectoryMember |
| User roles / active state | renderUsersScreen / handleRoleChange / handleToggleUserActive | updateUserAccount |
| Notifications | handleReadNotification | addNotification / notifyHandlingBody / generateDeadlineNotifications / markNotificationAsRead |
| Audit history | renderAuditScreen | recordAuditEvent |
| Case reports and CSV | renderReportsScreen | app/api/reports/cases/route.ts |
| Punishment reference | renderReferenceScreen | reference data in seed.ts; no institute-approved amounts have been supplied |

The render functions are ordinary nested functions. They read state and call handlers from the containing ARMSApp function. They return JSX (screen markup). This avoids passing a long list of form values between components. They do not save records themselves.

## Follow one complete report submission

Read `renderReportScreen`, then `submitReport` in the page file.

The form uses `onSubmit={submitReport}`. `event.preventDefault()` prevents the browser from reloading the page. The handler builds `FormData` because the request may include a file, then sends it to `/api/cases`.

Open `app/api/cases/route.ts`. `requireAuth` finds the user from the session. The route reads form values and validates uploaded bytes. `getState` supplies a copy of the records. `applyCommand` sees the action `report` and calls `submitNamedOrAnonymousReport`.

Inside that function, read the steps in order: check the role, prevent duplicate submission, validate fields, create a case ID, choose the initial handling body, create the record, add history, add audit, add notifications, return the ID.

Back in the route, `saveState` passes the records and optional file to `writeState` in storage.ts. A SQLite transaction saves them together, or rolls back the changes if a write fails. `publicSnapshot` selects information this user may see. The browser receives it and calls `setSnapshot`, causing React to display the new data.

## JavaScript/React syntax you should recognize

| Syntax | Meaning / C++ comparison |
| --- | --- |
| const / let | Local variables; const cannot be reassigned. Objects inside const can still change. |
| type User = { ... } | Describes object fields, similar to a struct definition. It does not validate runtime input automatically. |
| function f(x: string): boolean | A function taking a string and returning a boolean. |
| array.find(item => condition) | Search for the first matching element; the arrow is a short function like a lambda. |
| array.filter(item => condition) | Create an array containing matching elements. |
| array.map(item => result) | Create one output item for each input item, often a screen row. |
| array.some(item => condition) | True if at least one element matches. |
| ...object | Copy the object's fields into a new object; this is a shallow copy. |
| value?.field | Read the field only if value exists; otherwise produce undefined. |
| value ?? fallback | Use fallback only when value is null or undefined. |
| condition ? a : b | The same conditional idea as C++'s ternary operator. |
| async / await | The function waits for an asynchronous operation such as an HTTP request. Errors can be handled with try/catch. |
| useState | Stores a value React remembers between screen updates. Its setter requests a screen update. |
| useEffect | Runs the initial server-data request after the component appears. |
| JSX: {expression} | Inserts a JavaScript value into the HTML-like screen markup. |
| throw new DomainError(403, ...) | Stop the operation with an HTTP-friendly permission error. 401 means sign-in needed; 409 means conflict; 422 means invalid input. |

## Editing a requirement during the viva

- **Change the demo response target:** edit DEFAULT_CASE_RESPONSE_DAYS in service.ts. Existing cases keep their recorded due dates; new cases use the new value. This is a demo value, not an official deadline.
- **Change who may verify undertakings:** edit canReviewUndertaking in model.ts. Both the UI and server use this function. The submitted design currently permits only the administrator.
- **Change a workflow step:** edit nextStatus in model.ts. The screen and updateCaseStatus use it. Make sure it still matches the assignment state diagram.
- **Add a report category:** update categories in model.ts, routeFor in service.ts if its initial assignment differs, and any category-specific UI labels.
- **Add a report field:** add it to CaseRecord in model.ts, form state and renderReportScreen, submitReport's FormData, the cases API route and submitNamedOrAnonymousReport. Decide how old/sample records should display an absent value.
- **Change an upload rule:** edit validateFileBytes and MAX_UPLOAD_BYTES in upload.ts, plus the displayed file-help text and any browser validation. Keep the signed-undertaking PDF-only rule unless the requirement changes.
- **Change a dashboard calculation:** find the named count variables in page.tsx and the summary calculations in the reports API. Keep displayed totals and exports consistent.

After a change, run `npm run check`, `npm test` and `npm run test:storage`. Start the website, perform the changed action and check the other role involved. `npm run test:website` tests live HTTP workflows but adds sample records to the running server, so use an isolated test server when appropriate (see README).

For every function you study, answer: What calls it? What are its inputs? What does it check? What data does it change or return? Where is an error displayed? These questions are more useful than memorizing lines.


## Alignment fixes to study

- `canReviewUndertaking` permits the administrator, matching the submitted scenario.
- `startAnonymousReport` opens the public form. The report API uses a temporary anonymous actor when no session exists and the mode is anonymous. This actor is not a registered student account; all other protected endpoints still require authentication. `publicSnapshot` returns no protected records to this actor.
- `storage.ts` uses built-in Node SQLite, so no database server or added package is needed. `writeState` saves records, child rows, audit and the pending file inside a transaction. `COMMIT` confirms everything; `ROLLBACK` preserves the previous database on failure. Parent IDs link history/evidence to cases and submissions/reviews to undertakings. Record fields remain JSON payloads inside those SQL rows to keep the demo implementation small.
- `api-contracts.ts` translates the named design endpoints to the same existing business functions. The browser uses named status/reopen/review endpoints. Adding an alias does not duplicate the business rule.
- `scripts/test-storage.ts` checks JSON import, saved files, rollback and review permissions in a temporary folder. `scripts/test-contracts.ts` exercises the public anonymous API and protected named routes on a running test server.
