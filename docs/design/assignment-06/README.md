# ARMS design package: Assignments 6 and 7

Team T038 | CS314 | Anti-Ragging Monitoring System

This folder follows the directory layout in the assignment sheet. Assignment 6 covers the design class model and architecture. Assignment 7 covers user and software interfaces, component logic, and traceability. The three detailed use cases remain UC-003 Submit Named Report, UC-007 Update Case Status, and UC-011 Submit Anti-Ragging Undertaking.

## Files

| Deliverable | File |
| --- | --- |
| Design classes, data, UML | [Data-Class-Design.md](Data-Class-Design.md) |
| Architecture and rationale | [Architectural-Design.md](Architectural-Design.md) |
| Wireframes, navigation, service contracts | [Interface-Design.md](Interface-Design.md) |
| Logic for one main operation per use case | [Component-Level-Design.md](Component-Level-Design.md) |
| Requirement and model trace | [Design-Traceability.md](Design-Traceability.md) |
| Design class diagram | [diagrams/Design-Class-Diagram.png](diagrams/Design-Class-Diagram.png) |
| Architecture diagram | [diagrams/Architectural-Diagram.png](diagrams/Architectural-Diagram.png) |
| Refined component diagram | [diagrams/Component-Design-Diagram.png](diagrams/Component-Design-Diagram.png) |
| Five screen wireframes | [diagrams/interfaces/](diagrams/interfaces/) |

SVG versions and editable Graphviz sources are included with the PNG diagrams. The wireframe generator is kept outside this folder under `SWE/_work/assignment6_7`.

## Baseline decisions to review

The submitted `Assignment 4 .pdf` and `Assignment 5.pdf` contain the same twelve finalized classes. This package follows those submitted files. An older local Assignment 4 export lists thirteen classes and is not the baseline.

The design covers a signed PDF undertaking because the Assignment 3 scenario and later class model specify that workflow. The earlier SRS describes a form submission. The team should confirm the signed PDF flow as the approved interpretation.

The submitted Assignment 5 interface map includes category-based initial routing through the Case Workflow and Committee Directory components. This package preserves that small rule inside case creation. It does not add a separate routing module.

These documents describe the proposed software design. The current website is a front-end prototype with in-memory sample records. It does not yet provide a database, institutional sign-in, real file storage, or live notification delivery.

## Team review before submission

1. Open each PNG at normal size and verify every label and use-case flow.
2. Confirm the class, state and interface details against the submitted Assignments 4 and 5.
3. Record each member's actual contribution. Do not copy an unverified division of work.
4. Fill the AI declaration below after the team has reviewed the work.
5. Commit the documents and diagrams to the actual team GitHub repository. This local prototype checkout has no Git remote configured.

## Contribution and declaration fields for the team

| Student | Actual contribution, to be entered after review |
| --- | --- |
| Hussain Ali (24UCC209) | To be confirmed by Hussain |
| Kinjal Singh (24UCC210) | To be confirmed by Kinjal |
| Shashank Mathur (24UCC211) | To be confirmed by Shashank |
| Somik Jain (24UCC212) | To be confirmed by Somik |

AI tool used: OpenAI Codex. Purpose: drafting design documents and generating diagram and wireframe assets from the team's earlier ARMS assignments. Team review and verification: pending. Team representative: Hussain Ali. Date: enter the actual submission date.
