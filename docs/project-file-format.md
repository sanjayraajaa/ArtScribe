# Project File

The native project file is a single archive containing:

- **Structured document data** — the full screenplay, structure, notes, and formatting state, in a stable, versioned schema (JSON is a natural fit for a Rust/WebView stack).
- **Embedded attachments** — binary files referenced by the document, stored inside the same archive.
- **A version marker** — so a later build can detect and migrate an older save without data loss.

## Open decision

Decide up front whether this format must be byte-compatible with another screenwriting app's project archive (enabling direct file interchange) or is free to define its own schema. Either is workable; it changes how F-FILE-1 gets implemented, so settle it before writing the file I/O code.
