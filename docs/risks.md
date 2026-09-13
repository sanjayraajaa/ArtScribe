# Tauri-Specific Risks

| Type | Note |
|---|---|
| Risk | Three different WebView engines across OSes can render and behave differently (CSS support, spellcheck, drag-and-drop, print dialogs) — every Must-have feature needs a pass on all three, not just the dev machine's OS. |
| Risk | Pixel-accurate screenplay pagination (F-ED-3, F-EXP-1) is straightforward in a native text-layout engine like Qt's; reproducing exact industry page breaks in HTML/CSS layout is the single hardest parity item in this list and deserves an early spike. |
| Risk | A contenteditable-based screenplay editor at 120+ pages needs deliberate virtualization/windowing to stay responsive — plain contenteditable over the full document will not. |
| Open question | Whether to target byte-level compatibility with another screenwriting app's project files (see [Project File](project-file-format.md)) — decide before file I/O work starts. |
| Open question | Whether F-SPL-1 uses WebView-native spellcheck (simplest, least controllable) or a bundled Rust dictionary engine invoked over IPC (more control, more work). |
