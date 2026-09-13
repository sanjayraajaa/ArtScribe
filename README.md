# ArtScribe

A screenwriting app built on **Tauri** — a Rust core behind the OS's native WebView (WebView2 / WKWebView / WebKitGTK), no Qt/QML.

See [docs/](docs/README.md) for the full requirements and feature specification.

## Status

v1 vertical slice: document model, screenplay editor with auto-formatting, structure board, timeline, notebook, Fountain import/export, plain text/HTML export, print, project file save/open (`.artscribe`), autosave/crash recovery, and character/location/statistics reports. FDX import/export, rehearsal-sync playback, and phonetic transliteration are not yet implemented — see [docs/features.md](docs/features.md) for the full requirement list and priorities.

## Development

Requires [Rust](https://www.rust-lang.org/tools/install) and Node.js.

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```
