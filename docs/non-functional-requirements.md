# Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Platform parity** | Windows 10/11, macOS (Intel + Apple Silicon), and Linux, from one Tauri project, each using that OS's own WebView runtime. |
| **Offline-first** | No authoring, saving, or exporting feature depends on network access. |
| **Small footprint** | Installer and memory footprint should stay near Tauri's native-WebView baseline — a core reason to pick Tauri over a bundled-Chromium alternative. |
| **Performance** | Typing, pagination, and autocomplete stay responsive on a 120+ page screenplay with hundreds of scenes and characters. |
| **File fidelity** | Round-tripping a project file through the app must not lose scenes, notes, board layout, or formatting. |
| **Theming** | UI follows the OS's light/dark mode automatically. |
| **IPC discipline** | All filesystem access, format conversion, and spell-check computation happen in the Rust core; the WebView never touches the disk directly. |
| **Local data safety** | Sensitive local state (installation identity, cached credentials) is encrypted at rest, never plaintext on disk. |
