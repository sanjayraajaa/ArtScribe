import { create } from "zustand";
import type { Act, Character, Document, Note, NoteTarget, Scene } from "./types";

export type ViewName = "editor" | "structure" | "notebook" | "timeline" | "reports";

interface HistoryEntry {
  document: Document;
}

export interface DialogRequest {
  message: string;
  kind: "confirm" | "alert";
  danger?: boolean;
  resolve: (value: boolean) => void;
}

interface Store {
  document: Document | null;
  currentPath: string | null;
  dirty: boolean;
  view: ViewName;
  past: HistoryEntry[];
  future: HistoryEntry[];
  dialog: DialogRequest | null;

  loadDocument: (doc: Document, path: string | null) => void;
  setView: (view: ViewName) => void;

  /** Apply an edit without creating an undo checkpoint (used while typing). */
  patchDocument: (updater: (doc: Document) => Document) => void;
  /** Apply an edit and create an undo checkpoint (used on blur / structural edits). */
  commitDocument: (updater: (doc: Document) => Document) => void;

  undo: () => void;
  redo: () => void;

  markSaved: (path: string) => void;

  openDialog: (request: DialogRequest) => void;
  resolveDialog: (result: boolean) => void;
}

function cloneDocument(doc: Document): Document {
  return JSON.parse(JSON.stringify(doc));
}

export const useStore = create<Store>((set, get) => ({
  document: null,
  currentPath: null,
  dirty: false,
  view: "editor",
  past: [],
  future: [],
  dialog: null,

  loadDocument: (doc, path) =>
    set({
      document: doc,
      currentPath: path,
      dirty: false,
      past: [],
      future: [],
    }),

  setView: (view) => set({ view }),

  patchDocument: (updater) => {
    const { document } = get();
    if (!document) return;
    set({ document: updater(document), dirty: true });
  },

  commitDocument: (updater) => {
    const { document, past } = get();
    if (!document) return;
    const snapshot = cloneDocument(document);
    const next = updater(document);
    set({
      document: next,
      dirty: true,
      past: [...past, { document: snapshot }].slice(-100),
      future: [],
    });
  },

  undo: () => {
    const { document, past, future } = get();
    if (!document || past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      document: previous.document,
      past: past.slice(0, -1),
      future: [{ document: cloneDocument(document) }, ...future],
      dirty: true,
    });
  },

  redo: () => {
    const { document, past, future } = get();
    if (!document || future.length === 0) return;
    const next = future[0];
    set({
      document: next.document,
      past: [...past, { document: cloneDocument(document) }],
      future: future.slice(1),
      dirty: true,
    });
  },

  markSaved: (path) => set({ dirty: false, currentPath: path }),

  openDialog: (request) => set({ dialog: request }),

  resolveDialog: (result) => {
    const { dialog } = get();
    dialog?.resolve(result);
    set({ dialog: null });
  },
}));

export type { Scene, Character, Note, NoteTarget, Act, Document };
