import { useEffect, useState } from "react";
import { open as openFileDialog, save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { useStore } from "../store";
import { api } from "../api";
import { alertDialog, confirmDialog } from "../lib/dialog";
import {
  IconChevronDown,
  IconDownload,
  IconFilePlus,
  IconFolderOpen,
  IconPrinter,
  IconRedo,
  IconSave,
  IconSaveAs,
  IconUndo,
  IconUpload,
} from "./icons";

const PROJECT_FILTER = [{ name: "ArtScribe Project", extensions: ["artscribe"] }];
const FOUNTAIN_FILTER = [{ name: "Fountain", extensions: ["fountain"] }];

export default function Toolbar() {
  const document = useStore((s) => s.document);
  const currentPath = useStore((s) => s.currentPath);
  const dirty = useStore((s) => s.dirty);
  const past = useStore((s) => s.past);
  const future = useStore((s) => s.future);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const loadDocument = useStore((s) => s.loadDocument);
  const markSaved = useStore((s) => s.markSaved);
  const [recent, setRecent] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    api.getRecentFiles().then(setRecent).catch(() => {});
  }, [currentPath]);

  async function handleNew() {
    if (dirty && !(await confirmDialog("Discard unsaved changes and start a new screenplay?"))) return;
    const doc = await api.newDocument();
    loadDocument(doc, null);
  }

  async function handleOpenPath(path: string) {
    setBusy("Opening...");
    try {
      const doc = await api.openDocument(path);
      loadDocument(doc, path);
    } catch (e) {
      await alertDialog(`Could not open project: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleOpen() {
    const selected = await openFileDialog({ multiple: false, filters: PROJECT_FILTER });
    if (typeof selected === "string") await handleOpenPath(selected);
  }

  async function handleSave() {
    if (!document) return;
    let path = currentPath;
    if (!path) {
      const chosen = await saveFileDialog({ filters: PROJECT_FILTER, defaultPath: `${document.title}.artscribe` });
      if (!chosen) return;
      path = chosen;
    }
    setBusy("Saving...");
    try {
      await api.saveDocument(path, document);
      markSaved(path);
    } catch (e) {
      await alertDialog(`Could not save project: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveAs() {
    if (!document) return;
    const chosen = await saveFileDialog({ filters: PROJECT_FILTER, defaultPath: `${document.title}.artscribe` });
    if (!chosen) return;
    setBusy("Saving...");
    try {
      await api.saveDocument(chosen, document);
      markSaved(chosen);
    } catch (e) {
      await alertDialog(`Could not save project: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleImportFountain() {
    const selected = await openFileDialog({ multiple: false, filters: FOUNTAIN_FILTER });
    if (typeof selected !== "string") return;
    setBusy("Importing...");
    try {
      const doc = await api.importFountain(selected);
      loadDocument(doc, null);
    } catch (e) {
      await alertDialog(`Could not import: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleExport(kind: "fountain" | "text" | "html") {
    if (!document) return;
    setExportMenuOpen(false);
    const ext = kind === "html" ? "html" : kind === "text" ? "txt" : "fountain";
    const chosen = await saveFileDialog({
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
      defaultPath: `${document.title}.${ext}`,
    });
    if (!chosen) return;
    setBusy("Exporting...");
    try {
      if (kind === "fountain") await api.exportFountain(chosen, document);
      else if (kind === "text") await api.exportPlainText(chosen, document);
      else await api.exportHtml(chosen, document);
    } catch (e) {
      await alertDialog(`Could not export: ${e}`);
    } finally {
      setBusy(null);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <span className="app-title">ArtScribe</span>
      </div>
      <div className="toolbar-group">
        <button className="icon-button" onClick={handleNew} title="New screenplay">
          <IconFilePlus size={17} />
          <span>New</span>
        </button>
        <button className="icon-button" onClick={handleOpen} title="Open project">
          <IconFolderOpen size={17} />
          <span>Open</span>
        </button>
        <button className="icon-button" onClick={handleSave} title="Save">
          <IconSave size={17} />
          <span>Save</span>
        </button>
        <button className="icon-button" onClick={handleSaveAs} title="Save As">
          <IconSaveAs size={17} />
          <span>Save As</span>
        </button>
        {recent.length > 0 && (
          <select
            className="recent-select"
            value=""
            onChange={(e) => {
              if (e.target.value) handleOpenPath(e.target.value);
            }}
          >
            <option value="">Recent...</option>
            {recent.map((p) => (
              <option key={p} value={p}>
                {p.split("/").pop()}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="toolbar-group">
        <button className="icon-button" onClick={handleImportFountain} title="Import Fountain">
          <IconDownload size={17} />
          <span>Import</span>
        </button>
        <div className="dropdown">
          <button className="icon-button" onClick={() => setExportMenuOpen((v) => !v)} title="Export">
            <IconUpload size={17} />
            <span>Export</span>
            <IconChevronDown size={14} />
          </button>
          {exportMenuOpen && (
            <div className="dropdown-menu" onMouseLeave={() => setExportMenuOpen(false)}>
              <button onClick={() => handleExport("fountain")}>Fountain (.fountain)</button>
              <button onClick={() => handleExport("text")}>Plain Text (.txt)</button>
              <button onClick={() => handleExport("html")}>HTML (.html)</button>
            </div>
          )}
        </div>
        <button className="icon-button" onClick={handlePrint} title="Print">
          <IconPrinter size={17} />
          <span>Print</span>
        </button>
      </div>
      <div className="toolbar-group">
        <button className="icon-button" disabled={past.length === 0} onClick={undo} title="Undo">
          <IconUndo size={17} />
        </button>
        <button className="icon-button" disabled={future.length === 0} onClick={redo} title="Redo">
          <IconRedo size={17} />
        </button>
      </div>
      <div className="toolbar-group toolbar-status">
        {busy && <span className="busy">{busy}</span>}
        {!busy && <span className={dirty ? "dirty" : "saved"}>{dirty ? "Unsaved changes" : "Saved"}</span>}
      </div>
    </div>
  );
}
