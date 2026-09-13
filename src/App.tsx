import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { api } from "./api";
import { confirmDialog } from "./lib/dialog";
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import StructureBoard from "./components/StructureBoard";
import Timeline from "./components/Timeline";
import Notebook from "./components/Notebook";
import Reports from "./components/Reports";
import DialogHost from "./components/DialogHost";
import "./App.css";

const AUTOSAVE_INTERVAL_MS = 20_000;

function App() {
  const document = useStore((s) => s.document);
  const dirty = useStore((s) => s.dirty);
  const view = useStore((s) => s.view);
  const loadDocument = useStore((s) => s.loadDocument);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const recovery = await api.checkRecovery();
        if (recovery) {
          const restore = await confirmDialog(
            "ArtScribe found unsaved work from a previous session (crash recovery). Restore it?",
          );
          if (restore) {
            loadDocument(recovery.document, recovery.file_path);
            return;
          }
          await api.discardRecovery();
        }
      } catch {
        // no recovery file, or it couldn't be read — start fresh below.
      }
      const doc = await api.newDocument();
      loadDocument(doc, null);
    })();
  }, [loadDocument]);

  useEffect(() => {
    if (!dirty || !document) return;
    const timer = setInterval(() => {
      api.autosave(document).catch(() => {});
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [dirty, document]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  if (!document) {
    return (
      <div className="app-loading">
        <DialogHost />
        <p>Loading ArtScribe…</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <DialogHost />
      <Toolbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          {view === "editor" && <Editor />}
          {view === "structure" && <StructureBoard />}
          {view === "timeline" && <Timeline />}
          {view === "notebook" && <Notebook />}
          {view === "reports" && <Reports />}
        </main>
      </div>
    </div>
  );
}

export default App;
