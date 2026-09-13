# Features & Requirements

Legend: **Must** = table-stakes for parity · **Should** = expected by working writers · **Could** = defer past v1

## 4.1 Document Model

| ID | Requirement | Priority |
|---|---|---|
| F-DOC-1 | Screenplay as an ordered list of scenes, each with a heading and formatted paragraphs (action, dialogue, character, parenthetical, transition, shot), plus per-scene color, act, and synopsis. | Must |
| F-DOC-2 | A structure model independent of scene order: scenes placed on a 2D board, grouped into acts/beats, connected visually. | Must |
| F-DOC-3 | Characters and locations tracked as entities derived from the screenplay and kept in sync as it's edited. | Must |
| F-DOC-4 | A document-wide formatting profile (font, margins, element styles) applied consistently in editor, print, and export. | Must |
| F-DOC-5 | Named relationships between characters, modeled for visualization and export. | Should |
| F-DOC-6 | Binary attachments (images, PDFs, reference files) linked to scenes/characters/document, stored inside the project file. | Should |

## 4.2 Screenplay Editor

| ID | Requirement | Priority |
|---|---|---|
| F-ED-1 | Continuous scene-by-scene editor that auto-detects and auto-formats element type while typing, with manual override. | Must |
| F-ED-2 | Auto-complete scene headings, character names, and transitions from values already used in the document. | Must |
| F-ED-3 | Live pagination reflecting true printed page count and breaks while typing. | Must |
| F-ED-4 | Scene color, act marker, and synopsis editable inline, mirrored live in Structure and Timeline. | Should |
| F-ED-5 | Full undo/redo for every text and structural edit, coalesced into sensible units. | Must |
| F-ED-6 | Inline spelling underline with suggestions, respecting the document's active language. | Should |

## 4.3 Structure Board

| ID | Requirement | Priority |
|---|---|---|
| F-STR-1 | Freeform board where every scene is a draggable index card, groupable into acts, with a synopsis annotation. | Must |
| F-STR-2 | Curved connector lines between related cards, redrawn live as cards move. | Should |
| F-STR-3 | User-defined story-beat templates overlaid on the board as guides. | Could |
| F-STR-4 | Export the board as a standalone image or PDF. | Should |

## 4.4 Notebook

| ID | Requirement | Priority |
|---|---|---|
| F-NB-1 | Rich-text notes attachable to the document, a character, a location, or a scene. | Must |
| F-NB-2 | A single tree view aggregating all notes, characters, locations, and relationships for browsing. | Must |
| F-NB-3 | Visual, editable character-relationship graph (feeds F-DOC-5). | Should |
| F-NB-4 | User-definable structured forms (custom fields) per character, location, or scene. | Could |

## 4.5 Timeline

| ID | Requirement | Priority |
|---|---|---|
| F-TL-1 | Horizontal, act-banded timeline of every scene in screenplay order, scaled by scene length. | Must |
| F-TL-2 | Scene color and act boundaries shared live with Structure and Editor (single source of truth). | Must |

## 4.6 Rehearsal Sync

| ID | Requirement | Priority |
|---|---|---|
| F-SCR-1 | Load a local video or audio table-read/rehearsal recording and play it back alongside the screenplay text. | Should |
| F-SCR-2 | Mark scene-to-timestamp sync points so playback jumps follow scene boundaries. | Should |

## 4.7 Import

| ID | Requirement | Priority |
|---|---|---|
| F-IMP-1 | Import Final Draft `.fdx` files, mapping every element and character/scene metadata. | Must |
| F-IMP-2 | Import Fountain plain-text screenplays. | Must |
| F-IMP-3 | Import screenplay content from HTML. | Should |
| F-IMP-4 | Import from Open Screenplay Format (OSF). | Could |

## 4.8 Export

| ID | Requirement | Priority |
|---|---|---|
| F-EXP-1 | Export to industry-standard, paginated PDF matching the editor's page/margin/font rules. | Must |
| F-EXP-2 | Export to Final Draft `.fdx`. | Must |
| F-EXP-3 | Export to Fountain plain text. | Must |
| F-EXP-4 | Export to plain text and HTML. | Must |
| F-EXP-5 | Export to OpenDocument Text (`.odt`). | Should |
| F-EXP-6 | Export the relationship graph and structure board as standalone graphics. | Should |
| F-EXP-7 | Export any tabular report (4.9) to a spreadsheet file. | Could |

## 4.9 Reports

| ID | Requirement | Priority |
|---|---|---|
| F-REP-1 | Character report: every scene, line count, and note tied to a chosen character. | Must |
| F-REP-2 | Location report: every scene and note tied to a chosen location. | Must |
| F-REP-3 | Scene/character matrix showing which characters appear in which scenes. | Should |
| F-REP-4 | Statistics report: page/word/scene counts, dialogue-to-action ratio, per-character screen time. | Must |
| F-REP-5 | Scene-metadata and full-notebook reports for production paperwork. | Should |
| F-REP-6 | Filtered subset report/print (by character, location, act, or color). | Should |

## 4.10 Language & Spell Check

| ID | Requirement | Priority |
|---|---|---|
| F-LANG-1 | Phonetic transliteration so a writer can type Indian or international languages using the Latin alphabet. | Must |
| F-LANG-2 | Language settable per document, and optionally per scene/paragraph. | Should |
| F-SPL-1 | Background spell check against the active language with no network dependency. | Must |

## 4.11 Project Files & System

| ID | Requirement | Priority |
|---|---|---|
| F-FILE-1 | Save/open the native project file as a single archive bundling structured document data with embedded attachments. | Must |
| F-FILE-2 | Recent-documents list for fast reopening. | Must |
| F-FILE-3 | Detect external modification of an open file and prompt before overwriting. | Should |
| F-FILE-4 | Periodic autosave with crash-recovery reload on next launch. | Must |
| F-SYS-1 | Native, platform-appropriate update check and install. | Should |
| F-SYS-2 | Crash capture with recovery of the in-progress document on relaunch. | Should |
| F-PRT-1 | Print directly to any OS-registered printer using the same pagination as PDF export. | Must |
