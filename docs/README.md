# ArtScribe — Requirements & Feature Specification

Pure requirements and features for a screenwriting app targeted at a **Tauri** build — a Rust core behind a native WebView, no Qt/QML. Implementation choices (frontend framework, state library, component kit) are left to the build.

| | |
|---|---|
| **Revision** | 2nd draft |
| **Date** | 2026-09-13 |
| **Target stack** | Tauri (Rust core + OS WebView) |
| **Supersedes** | Qt/QML native clone SRS |

## Contents

1. [Purpose & Scope](purpose-and-scope.md)
2. [Shape of the App](architecture.md)
3. [Features & Requirements](features.md)
4. [Non-Functional Requirements](non-functional-requirements.md)
5. [Candidate Building Blocks](building-blocks.md)
6. [Project File](project-file-format.md)
7. [Out of Scope (v1)](out-of-scope.md)
8. [Acceptance Criteria](acceptance-criteria.md)
9. [Tauri-Specific Risks](risks.md)

---

Pure requirements and features only — no implementation code included. Framework, state management, and component choices are intentionally left open for the build phase.
