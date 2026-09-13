# Shape of the App

Two tiers, connected by Tauri's IPC bridge instead of a C++/QML bridge object: a Rust core owns the document model, file I/O, and heavy computation; the WebView-hosted UI owns presentation and interaction. The UI never touches the filesystem or performs format conversion directly — it calls into Rust commands and receives structured data back.

## WebView UI

- Editor, Structure board, Notebook, Timeline, Rehearsal-sync views
- Renders document state; sends edits and commands to the core
- No direct file access — everything crosses the IPC bridge

&#8596;

## Rust core

- Document model: screenplay, scenes, structure, notes, attachments
- Undo stack, project file I/O, importers, exporters, reports
- Language/transliteration and spell-check integration

## Consequence of a WebView shell

Everything the reference app hand-rolled or ported into C++ for its QML canvas (rich-text notes, curved connector lines, phonetic transliteration) can instead run as ordinary JavaScript in the WebView — no porting required for those pieces. That's flagged per-feature in [Candidate Building Blocks](building-blocks.md).
