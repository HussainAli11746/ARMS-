# Assignments 6 and 7: Design traceability

## 1. Baseline and selected use cases

The selected use cases are UC-003 Submit Named Report, UC-007 Update Case Status, and UC-011 Submit Anti-Ragging Undertaking. Assignment 3 provides the scenario and activity flow for each. The submitted Assignments 4 and 5 confirm the twelve-class model, the three collaboration diagrams, the two state diagrams and the component/interface map used below.

| Use case | SRS requirements and rules | Analysis classes | Design components | Screens / contracts | Internal operation |
| --- | --- | --- | --- | --- | --- |
| UC-003 named report | FR-003, FR-005, FR-007 to FR-010, FR-016, FR-019, FR-023; BR-001, BR-002, BR-006 | `User`, `Role`, `Case`, `EvidenceAttachment`, `CaseHistory`, `CommitteeDirectoryEntry`, `Notification`, `AuditLog` | Access and Role; Reporting and Evidence; Case Workflow; Directory; Notification; Audit and Persistence | Wireframes 01 and 02; `IReportSubmission.submitNamed`, `ICaseCreation.create`, `IRoutingDirectory.initialBodyFor`, `IFileStorage.stageEvidence` | `submitNamedReport()` |
| UC-007 status update | FR-003, FR-011 to FR-015, FR-020, FR-023; BR-001, BR-004, BR-005, BR-007 | `User`, `Role`, `Case`, `CaseHistory`, `CaseStatusValidator`, `Notification`, `AuditLog` | Access and Role; Case Workflow; Notification; Audit and Persistence | Wireframe 03; `ICaseWorkflow.getCase`, `permittedTransitions`, `updateStatus`, `reopen` | `updateCaseStatus()` and controlled reopening |
| UC-011 signed undertaking | FR-003, FR-017, FR-019, FR-023; access and audit rules | `User`, `Role`, `Undertaking`, `UndertakingVerification`, `Notification`, `AuditLog` | Access and Role; Undertaking; Notification; Audit and Persistence | Wireframes 04 and 05; `IUndertaking.submit`, `review` | `submitUndertaking()` and `reviewUndertaking()` |

`CommitteeDirectoryEntry` supports the authorized directory and category-based initial body lookup used in the submitted Assignment 5 interface mapping. `NotificationService` delivers messages prepared by `Notification`. Both are present in the twelve-class model; neither creates a new use case in this package.

## 2. Model-to-design checks

| Earlier model or decision | Design consequence | Check |
| --- | --- | --- |
| Assignment 4 composition: Case owns evidence and history | Case transaction stores evidence metadata and a first history entry; history remains linked to one case. | [Data design](Data-Class-Design.md), [UC-003 logic](Component-Level-Design.md) |
| Assignment 4 dependency: Case uses CaseStatusValidator; validator uses Role | Server checks permitted transitions and role before changing status. | [Class diagram](diagrams/Design-Class-Diagram.png), [UC-007 logic](Component-Level-Design.md) |
| Assignment 4 composition: Undertaking owns verification records | Each decision remains tied to its undertaking and session. | [Data design](Data-Class-Design.md), [UC-011 logic](Component-Level-Design.md) |
| Assignment 4 dependency: Notification uses NotificationService | Notification delivery follows a successful save and can retry separately. | [Architecture](Architectural-Design.md), [component diagram](diagrams/Component-Design-Diagram.png) |
| Assignment 3 case and undertaking states | UI and services use the same reported/open/closed and pending/accepted/rejected meanings. | [Interface design](Interface-Design.md), [component logic](Component-Level-Design.md) |
| SRS privacy, security and audit requirements | Session-derived actor, server-side permission checks, private file storage, audit writes. | [Architecture](Architectural-Design.md), [interface contracts](Interface-Design.md) |

## 3. Known differences requiring team review

The submitted Assignment 4 and 5 PDFs both use twelve finalized classes. An older local Assignment 4 export lists thirteen classes and is not the submitted baseline.

The detailed UC-011 in Assignment 2 describes a declaration form, while Assignment 3 and the later class model use a signed PDF with administrator verification. This design follows the later workflow. If the instructor expects the earlier form-only flow, the undertaking screens, data fields and component logic must be revised together.

The submitted Assignment 5 interface map describes category-based initial routing through the Case Workflow and Committee Directory components. This design uses that rule during case creation, with no separate routing module. The team should be ready to explain that distinction.

The available `Assignment 5.pdf` contains the final diagrams. The package was compared with the collaboration, state and component pages in that submitted file.

## 4. Submission review record

Team review status: pending. Before submitting, each member should inspect the diagram labels, the three operation specifications, the API errors, and the baseline decisions above. Record any changes in Git history and enter actual individual contributions and the AI declaration in the package README.
