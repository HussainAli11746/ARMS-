# ARMS Prototype Roadmap

## Current foundation

Assignments 1 to 5 define the system boundary, the class and component models, and the three workflows used for the showcase:

- UC-003 Submit Named Report
- UC-007 Update Case Status
- UC-011 Submit Anti-Ragging Undertaking

The prototype covers these workflows with a demonstration role switch, named and anonymous reporting, case history, permitted status updates, and signed-PDF undertaking review. Reports record incident date, time, people involved, description and optional evidence. Report submission creates a case, initial category-based assignment, notification and audit entries. The undertaking moves through Pending Verification, Accepted/Verified or Rejected; rejection requires a reason and permits resubmission.

The case workflow follows the lifecycle in Assignment 3: Reported, Acknowledged, Under Investigation, Findings Recorded, Escalated to Committee, Committee Decision Recorded, Action Taken and Closed. The prototype enforces the next transition and hands escalated cases to the Committee. A Committee member can reopen a closed case only after entering a reason. Category rules make the initial assignment inside the case workflow; there is no separate routing module. Records survive refresh in this browser, and uploaded files are stored locally on this device. This is not a production database, institutional authentication, secure authorization, shared multi-user storage or live notification service. Do not enter real incident details or sensitive documents.

## Assignment 4 completion

The submitted Assignment 4 defines 12 classes: User, Role, Case, EvidenceAttachment, CaseHistory, Undertaking, UndertakingVerification, Notification, CommitteeDirectoryEntry, AuditLog, CaseStatusValidator and NotificationService. It documents their attributes and responsibilities, provides a class diagram, and includes an object-diagram snapshot for UC-003.

The prototype presents those records in the reporting, case-management, undertaking, directory and notification views. The submitted class model uses association, composition and dependency. It does not introduce inheritance, aggregation or separate Report, CaseAssignment, SubmissionWindow or PunishmentReference classes.

## Assignment 5 alignment

The submitted Assignment 5 adds collaboration diagrams for UC-003, UC-007 and UC-011, state diagrams for Case and Undertaking, and a component diagram with interfaces and dependencies. The showcase follows those three collaborations. The site represents the proposed components as UI and client-side workflow logic; it does not claim that browser-local demo storage is the final deployment architecture.

## Remaining production work

- Replace the role switch with institutional authentication and server-enforced permissions.
- Move case records, audit logs and signed PDFs to a shared, access-controlled backend.
- Connect genuine notification delivery, approved contact directory and deadline policy.
- Carry out security, privacy, accessibility and multi-user testing before real use.

Expected evidence: module design, data model, working prototype, validation results, test checklist and requirements traceability.

## Midterm preparation

- Be ready to explain the progression from problem definition to requirements, scenarios, UML models and prototype screens.
- Demonstrate the three detailed use cases end to end.
- Explain role permissions and why sensitive case information is restricted.
- Show how each prototype screen maps back to Assignment 2 requirements.
- Clearly distinguish completed prototype behaviour from planned production features.
- Keep a short team contribution record as implementation progresses.
