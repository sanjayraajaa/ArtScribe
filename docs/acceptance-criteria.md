# Acceptance Criteria

- Builds and packages on Windows, macOS, and Linux from one Tauri project.
- Every **Must** requirement in [Features & Requirements](features.md) is implemented and manually verified.
- PDF export page count and page breaks match the reference app for an equivalent formatting profile.
- Import round-trip (FDX → app → FDX) preserves scene count, character names, and dialogue text.
- Spell check and transliteration work with no network connection present.
- A 120-page screenplay with 40+ characters stays responsive — no dropped keystrokes, sub-second report generation.
- The app behaves consistently on all three WebView engines (WebView2, WKWebView, WebKitGTK) for every Must-have feature.
