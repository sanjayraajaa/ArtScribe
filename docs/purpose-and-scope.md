# Purpose & Scope

## Purpose

This is a tech-agnostic requirements and feature list for **ArtScribe**, a screenwriting application, written so it can be built on **Tauri**: a Rust application core packaged with each OS's native WebView (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux) instead of a bundled browser engine. It replaces the earlier Qt/QML "same stack" specification — the target stack has changed, the feature target has not.

This document states *what* the app must do. It intentionally does not prescribe a frontend framework, state library, or component kit — those are build-time decisions for whoever implements it. Where a technology note is useful, it's marked as a candidate in [Candidate Building Blocks](building-blocks.md), not a requirement.

## Scope

**In scope:** a desktop screenwriting app for Windows, macOS, and Linux — screenplay editing, structure/story-beats, notebook, timeline, rehearsal-sync playback, import/export, reporting, multilingual typing, spell check, undo/redo, and local project files. Offline-first: every authoring feature must work with no network connection.

**Out of scope for this pass:** any hosted backend, account system, or cloud sync (see [Out of Scope](out-of-scope.md)), and pixel-exact visual parity with the Qt/QML UI — behavioral and file parity are the targets, not identical chrome.
