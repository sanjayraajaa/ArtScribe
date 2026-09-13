import { useRef, useState } from "react";
import { useStore } from "../store";
import type { Note, NoteTarget } from "../types";
import { newNote } from "../lib/model";
import { confirmDialog } from "../lib/dialog";
import { IconClapperboard, IconFileText, IconList, IconMapPin, IconPlus, IconTrash, IconUser } from "./icons";

function targetsEqual(a: NoteTarget, b: NoteTarget): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "Document" || b.kind === "Document") return a.kind === b.kind;
  return (a as any).id === (b as any).id;
}

function targetLabel(target: NoteTarget): string {
  switch (target.kind) {
    case "Document":
      return "Document Notes";
    case "Character":
      return "Character";
    case "Location":
      return "Location";
    case "Scene":
      return "Scene";
  }
}

export default function Notebook() {
  const document = useStore((s) => s.document);
  const commitDocument = useStore((s) => s.commitDocument);
  const patchDocument = useStore((s) => s.patchDocument);
  const [selected, setSelected] = useState<NoteTarget>({ kind: "Document" });
  const bodyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  if (!document) return null;

  const notesForSelected = document.notes.filter((n) => targetsEqual(n.attached_to, selected));

  function addNote() {
    const created = newNote("New note", selected);
    commitDocument((doc) => ({ ...doc, notes: [...doc.notes, created] }));
  }

  async function deleteNote(noteId: string) {
    if (!(await confirmDialog("Delete this note?", { danger: true }))) return;
    commitDocument((doc) => ({ ...doc, notes: doc.notes.filter((n) => n.id !== noteId) }));
  }

  function updateNoteTitle(noteId: string, title: string) {
    commitDocument((doc) => ({
      ...doc,
      notes: doc.notes.map((n) => (n.id === noteId ? { ...n, title } : n)),
    }));
  }

  function updateNoteBody(noteId: string, html: string) {
    patchDocument((doc) => ({
      ...doc,
      notes: doc.notes.map((n) => (n.id === noteId ? { ...n, body_html: html } : n)),
    }));
  }

  function commitNoteBody() {
    commitDocument((doc) => doc);
  }

  function exec(command: string) {
    window.document.execCommand(command);
  }

  return (
    <div className="notebook-view">
      <div className="notebook-tree">
        <div className="tree-section-title">Document</div>
        <button
          className={`tree-item ${selected.kind === "Document" ? "active" : ""}`}
          onClick={() => setSelected({ kind: "Document" })}
        >
          <IconFileText size={15} />
          Document Notes
        </button>

        <div className="tree-section-title">Characters</div>
        {document.characters.length === 0 && <div className="tree-empty">No characters yet</div>}
        {document.characters.map((c) => (
          <button
            key={c.id}
            className={`tree-item ${selected.kind === "Character" && (selected as any).id === c.id ? "active" : ""}`}
            onClick={() => setSelected({ kind: "Character", id: c.id })}
          >
            <IconUser size={15} />
            {c.name}
            <span className="tree-item-count">
              {document.notes.filter((n) => n.attached_to.kind === "Character" && (n.attached_to as any).id === c.id).length}
            </span>
          </button>
        ))}

        <div className="tree-section-title">Locations</div>
        {document.locations.length === 0 && <div className="tree-empty">No locations yet</div>}
        {document.locations.map((l) => (
          <button
            key={l.id}
            className={`tree-item ${selected.kind === "Location" && (selected as any).id === l.id ? "active" : ""}`}
            onClick={() => setSelected({ kind: "Location", id: l.id })}
          >
            <IconMapPin size={15} />
            {l.name}
            <span className="tree-item-count">
              {document.notes.filter((n) => n.attached_to.kind === "Location" && (n.attached_to as any).id === l.id).length}
            </span>
          </button>
        ))}

        <div className="tree-section-title">Scenes</div>
        {document.scenes.map((sc) => (
          <button
            key={sc.id}
            className={`tree-item ${selected.kind === "Scene" && (selected as any).id === sc.id ? "active" : ""}`}
            onClick={() => setSelected({ kind: "Scene", id: sc.id })}
          >
            <IconClapperboard size={15} />
            {sc.heading}
            <span className="tree-item-count">
              {document.notes.filter((n) => n.attached_to.kind === "Scene" && (n.attached_to as any).id === sc.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="notebook-detail">
        <div className="notebook-detail-header">
          <h3>{targetLabel(selected)}</h3>
          <button className="primary-button" onClick={addNote}>
            <IconPlus size={15} />
            New Note
          </button>
        </div>

        {notesForSelected.length === 0 && <p className="notebook-empty">No notes yet.</p>}

        {notesForSelected.map((note: Note) => (
          <div className="note-card" key={note.id}>
            <div className="note-card-header">
              <input
                className="note-title-input"
                value={note.title}
                onChange={(e) => updateNoteTitle(note.id, e.target.value)}
              />
              <button className="icon-button ghost danger" onClick={() => deleteNote(note.id)} title="Delete note">
                <IconTrash size={15} />
              </button>
            </div>
            <div className="note-toolbar">
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
                <b>B</b>
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
                <i>I</i>
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>
                <u>U</u>
              </button>
              <button onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")} title="Bullet list">
                <IconList size={15} />
              </button>
            </div>
            <div
              className="note-body"
              contentEditable
              suppressContentEditableWarning
              ref={(el) => {
                bodyRefs.current[note.id] = el;
                if (el && el.innerHTML !== note.body_html) {
                  el.innerHTML = note.body_html;
                }
              }}
              onInput={(e) => updateNoteBody(note.id, (e.target as HTMLDivElement).innerHTML)}
              onBlur={commitNoteBody}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
