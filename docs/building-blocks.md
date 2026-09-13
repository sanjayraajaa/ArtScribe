# Candidate Building Blocks

Not requirements — a starting shortlist for whoever implements this, so the feature list doesn't have to be re-researched from scratch. Swap freely.

| Capability | Candidate | Note |
|---|---|---|
| Project file archive | `zip` / `tar` crate (Rust) | A single archive bundling structured data with embedded attachments. |
| FDX / XML parsing | `quick-xml` or `roxmltree` (Rust) | Used for both FDX import and export. |
| PDF generation | WebView print-to-PDF, or `printpdf`/`genpdf` (Rust) | Pagination accuracy is the hardest parity item — see [Risks](risks.md). |
| Rich-text notes editor | Tiptap, ProseMirror, or Quill — run directly as JS in the WebView | No porting needed; this is a case where Tauri is simpler than the Qt/QML route. |
| Structure board / connectors | React Flow, Konva.js, or a plain Canvas/SVG layer; curved-arrow libraries run as-is | Same "runs directly as JS" advantage as above. |
| Phonetic transliteration | Sanscript.js, used directly as JS | No native port required, unlike the Qt/QML build. |
| Spell check | Browser spellcheck attribute for a fast path, or a Rust `hunspell` binding via IPC for full control | Browser spellcheck varies by WebView engine — verify behavior on all three OSes. |
| Charts (statistics report) | Chart.js, Recharts, or D3 | |
| Local-state encryption | `ring` or `aes-gcm` crate (Rust) | |
| Auto-update | Tauri's built-in updater plugin | Replaces a hand-rolled updater. |
| Crash reporting | Rust panic hook + `sentry` SDK, or Tauri's crash-reporting plugin | |
| Native print | Tauri's print/dialog plugin | |
