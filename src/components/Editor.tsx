import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useStore } from "../store";
import type { Document, ElementType, Scene } from "../types";
import { ELEMENT_TYPE_CYCLE, ELEMENT_TYPE_LABELS, nextElementType } from "../types";
import {
  formatHeading,
  newElement,
  newScene,
  parseHeading,
  resyncEntities,
  SCENE_PREFIX_OPTIONS,
  SCENE_TIME_OPTIONS,
  sceneWordCount,
  tint,
  uuid,
  wordCount,
} from "../lib/model";
import { confirmDialog } from "../lib/dialog";
import {
  IconAlignLeft,
  IconArrowLeftRight,
  IconCamera,
  IconMessageSquare,
  IconParentheses,
  IconPlus,
  IconTrash,
  IconUser,
} from "./icons";

const HEADING_PATTERN = /^(INT\.\/EXT\.|INT\/EXT|EXT\.\/INT\.|INT\.|EXT\.|EST\.|I\/E\.)\s*\S/i;
const COMMON_TRANSITIONS = ["CUT TO:", "DISSOLVE TO:", "SMASH CUT TO:", "FADE TO:", "FADE OUT."];

const TYPE_ICONS: Record<ElementType, typeof IconAlignLeft> = {
  scene_heading: IconAlignLeft,
  action: IconAlignLeft,
  character: IconUser,
  dialogue: IconMessageSquare,
  parenthetical: IconParentheses,
  transition: IconArrowLeftRight,
  shot: IconCamera,
};

function cycleType(current: ElementType, direction: 1 | -1): ElementType {
  const idx = ELEMENT_TYPE_CYCLE.indexOf(current);
  const base = idx === -1 ? 0 : idx;
  const next = (base + direction + ELEMENT_TYPE_CYCLE.length) % ELEMENT_TYPE_CYCLE.length;
  return ELEMENT_TYPE_CYCLE[next];
}

/** If a committed Action line looks like a scene heading and isn't already
 * the first element of its scene, split the scene there (F-ED-1 auto-detect). */
function maybeSplitOnHeading(doc: Document, sceneId: string, elementId: string): Document {
  const sceneIdx = doc.scenes.findIndex((s) => s.id === sceneId);
  if (sceneIdx === -1) return doc;
  const scene = doc.scenes[sceneIdx];
  const elIdx = scene.elements.findIndex((e) => e.id === elementId);
  if (elIdx <= 0) return doc;
  const el = scene.elements[elIdx];
  if (el.type !== "action" || !HEADING_PATTERN.test(el.text.trim())) return doc;

  const before = scene.elements.slice(0, elIdx);
  const after = scene.elements.slice(elIdx + 1);
  const updatedCurrent: Scene = {
    ...scene,
    elements: before.length ? before : [newElement("action", "")],
  };
  const createdScene = newScene(el.text.trim().toUpperCase(), scene.act_id);
  createdScene.elements = after.length ? after : [newElement("action", "")];

  const scenes = [...doc.scenes];
  scenes.splice(sceneIdx, 1, updatedCurrent, createdScene);
  return { ...doc, scenes };
}

type FieldEl = HTMLTextAreaElement | HTMLInputElement;

const SINGLE_LINE_TYPES: ElementType[] = ["character", "parenthetical", "transition", "shot"];

/** Multi-line element types (action, dialogue) render as an auto-growing
 * textarea; single-line types render as an <input>. Character and
 * Transition pass `suggestions` to get an app-styled autocomplete combobox
 * instead of a plain field. */
function ElementField({
  elementType,
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  className,
  fieldRef,
  suggestions,
}: {
  elementType: ElementType;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<FieldEl>) => void;
  onFocus: () => void;
  onBlur: () => void;
  className: string;
  fieldRef: (el: FieldEl | null) => void;
  suggestions?: string[];
}) {
  if (suggestions) {
    return (
      <ComboBox
        fieldRef={fieldRef}
        className={className}
        value={value}
        options={suggestions}
        onChange={onChange}
        onFocus={onFocus}
        onCommit={onBlur}
        onKeyDown={onKeyDown}
      />
    );
  }

  if (SINGLE_LINE_TYPES.includes(elementType)) {
    return (
      <input
        ref={fieldRef}
        className={className}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        spellCheck
      />
    );
  }

  const resize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  return (
    <textarea
      ref={(el) => {
        fieldRef(el);
        resize(el);
      }}
      className={className}
      value={value}
      rows={1}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        resize(e.target);
      }}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      spellCheck
    />
  );
}

/** Static toolbar pinned above the page (not per-line) for changing the
 * currently-focused element's type — click, or ⌘1 .. ⌘6 / Ctrl+1 .. 6. */
function ElementTypeBar({
  activeType,
  onSelect,
}: {
  activeType: ElementType | null;
  onSelect: (type: ElementType) => void;
}) {
  return (
    <div className="element-type-bar">
      {ELEMENT_TYPE_CYCLE.map((t, i) => {
        const Icon = TYPE_ICONS[t];
        return (
          <button
            key={t}
            type="button"
            className={`element-type-bar-item ${t === activeType ? "active" : ""}`}
            title={`${ELEMENT_TYPE_LABELS[t]} (⌘${i + 1})`}
            disabled={activeType === null}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(t)}
          >
            <Icon size={16} />
            <span>{ELEMENT_TYPE_LABELS[t]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Writable Act picker: type to filter existing acts, click to select, or
 * commit (blur/Enter) a name that doesn't match anything to create a new
 * act on the fly — same "free text + reminder list" pattern as ComboBox,
 * extended to an id-referencing field instead of a plain string. */
function ActField({
  acts,
  value,
  onSelectExisting,
  onCreateNew,
  onClear,
}: {
  acts: { id: string; name: string; color: string | null }[];
  value: string | null;
  onSelectExisting: (id: string) => void;
  onCreateNew: (name: string) => void;
  onClear: () => void;
}) {
  const current = acts.find((a) => a.id === value);
  const [text, setText] = useState(current?.name ?? "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setText(current?.name ?? "");
  }, [current?.name]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.document.addEventListener("mousedown", onDocMouseDown);
    return () => window.document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function commit() {
    setOpen(false);
    const trimmed = text.trim();
    if (!trimmed) {
      onClear();
      return;
    }
    const match = acts.find((a) => a.name.toUpperCase() === trimmed.toUpperCase());
    if (match) onSelectExisting(match.id);
    else onCreateNew(trimmed);
  }

  const filtered = acts.filter((a) => !text.trim() || a.name.toUpperCase().includes(text.trim().toUpperCase()));
  const isNewName = text.trim().length > 0 && !acts.some((a) => a.name.toUpperCase() === text.trim().toUpperCase());

  return (
    <div className="act-field" ref={wrapRef}>
      <input
        className="act-field-input"
        value={text}
        placeholder="No act"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {open && (filtered.length > 0 || isNewName) && (
        <div className="type-menu-panel vertical combo-panel">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`type-menu-item-row ${a.id === value ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectExisting(a.id);
                setText(a.name);
                setOpen(false);
              }}
            >
              <span className="act-menu-swatch" style={{ background: a.color ?? "var(--line-strong)" }} />
              {a.name}
            </button>
          ))}
          {isNewName && (
            <button
              type="button"
              className="type-menu-item-row"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateNew(text.trim());
                setOpen(false);
              }}
            >
              <IconPlus size={13} /> Create "{text.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Editable text field with an app-styled suggestion dropdown (replaces
 * native <input list> datalist popups, which can't be restyled). Free text
 * is always allowed — the list is a reminder, not a constraint. */
function ComboBox({
  value,
  onChange,
  onCommit,
  options,
  className,
  placeholder,
  fieldRef,
  onFocus,
  onKeyDown,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  options: string[];
  className?: string;
  placeholder?: string;
  fieldRef?: (el: HTMLInputElement | null) => void;
  onFocus?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const filtered = options
    .filter((o) => o.trim().length > 0)
    .filter((o) => o.toUpperCase() !== value.trim().toUpperCase())
    .filter((o) => !value.trim() || o.toUpperCase().includes(value.trim().toUpperCase()))
    .slice(0, 8);

  useEffect(() => {
    setHighlight(-1);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.document.addEventListener("mousedown", onDocMouseDown);
    return () => window.document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function selectOption(opt: string) {
    onChange(opt);
    setOpen(false);
    onCommit?.();
  }

  return (
    // The suggestion panel below anchors to this wrapper's box, so the
    // wrapper must carry the same sizing/position class as the input
    // itself (e.g. .el-character's fixed width + auto margin) — otherwise
    // the wrapper defaults to full-row width and the panel ends up
    // floating away from wherever the (centered/narrow) input actually is.
    <div className={`combo-box ${className ?? ""}`} ref={wrapRef}>
      <input
        ref={fieldRef}
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          onFocus?.();
        }}
        onBlur={() => {
          setOpen(false);
          onCommit?.();
        }}
        onKeyDown={(e) => {
          if (open && filtered.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            const delta = e.key === "ArrowDown" ? 1 : -1;
            setHighlight((h) => (h + delta + filtered.length) % filtered.length);
            return;
          }
          if (open && highlight >= 0 && e.key === "Enter") {
            e.preventDefault();
            selectOption(filtered[highlight]);
            return;
          }
          if (open && e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            return;
          }
          onKeyDown?.(e);
        }}
      />
      {open && filtered.length > 0 && (
        <div className="type-menu-panel vertical combo-panel">
          {filtered.map((opt, i) => (
            <button
              key={opt}
              type="button"
              className={`type-menu-item-row ${i === highlight ? "highlight" : ""}`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(opt);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The INT./Location/DAY controls each hold their own local text while
 * being edited, only reconstructing and committing the combined heading
 * string on blur/select. Re-deriving all three from a live re-parse of the
 * combined string on every keystroke (the previous approach) is lossy
 * whenever one valid value is a text-prefix of another (typing "INT./EXT."
 * collapses back to "INT." the moment you type past it) and trims trailing
 * spaces out of Location as you type them. */
function SceneHeadingFields({
  heading,
  onCommit,
  locationSuggestions,
}: {
  heading: string;
  onCommit: (newHeading: string) => void;
  locationSuggestions: string[];
}) {
  const parsed = parseHeading(heading);
  const [prefix, setPrefix] = useState(parsed.prefix);
  const [location, setLocation] = useState(parsed.location);
  const [time, setTime] = useState(parsed.time);

  useEffect(() => {
    const p = parseHeading(heading);
    setPrefix(p.prefix);
    setLocation(p.location);
    setTime(p.time);
  }, [heading]);

  function commit(next: Partial<{ prefix: string; location: string; time: string }>) {
    onCommit(formatHeading(next.prefix ?? prefix, next.location ?? location, next.time ?? time));
  }

  return (
    <>
      <ComboBox
        className="scene-prefix-input"
        value={prefix}
        options={SCENE_PREFIX_OPTIONS}
        onChange={(v) => setPrefix(v.toUpperCase())}
        onCommit={() => commit({ prefix })}
      />
      <ComboBox
        className="scene-location-input"
        value={location}
        options={locationSuggestions}
        placeholder="Location"
        onChange={setLocation}
        onCommit={() => commit({ location })}
      />
      <span className="scene-heading-dash">-</span>
      <ComboBox
        className="scene-time-input"
        value={time}
        options={SCENE_TIME_OPTIONS}
        placeholder="DAY"
        onChange={(v) => setTime(v.toUpperCase())}
        onCommit={() => commit({ time })}
      />
    </>
  );
}

export default function Editor() {
  const document = useStore((s) => s.document);
  const patchDocument = useStore((s) => s.patchDocument);
  const commitDocument = useStore((s) => s.commitDocument);
  const refs = useRef<Record<string, FieldEl | null>>({});
  const [active, setActive] = useState<{ sceneId: string; elementId: string } | null>(null);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (!active || e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      const idx = Number(e.key) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= ELEMENT_TYPE_CYCLE.length) return;
      e.preventDefault();
      setElementType(active.sceneId, active.elementId, ELEMENT_TYPE_CYCLE[idx]);
      // Action/Character/Dialogue etc. render as different DOM element types
      // (textarea vs. input), so React remounts the field on a type change
      // and drops focus/cursor — put it back on the (new) field.
      focusElement(active.elementId);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  if (!document) return null;

  const activeElement = active
    ? document.scenes.find((s) => s.id === active.sceneId)?.elements.find((e) => e.id === active.elementId)
    : undefined;

  const allCharacterNames = document.characters.map((c) => c.name);
  const allLocationNames = document.locations.map((l) => l.name);
  const allTransitions = Array.from(
    new Set([
      ...COMMON_TRANSITIONS,
      ...document.scenes.flatMap((s) => s.elements.filter((e) => e.type === "transition").map((e) => e.text)),
    ]),
  );

  function focusElement(id: string) {
    requestAnimationFrame(() => {
      const el = refs.current[id];
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  function updateDocumentField(patch: Partial<{ title: string; subtitle: string; author: string; draft: string }>) {
    commitDocument((doc) => ({ ...doc, ...patch }));
  }

  function updateSceneField(sceneId: string, patch: Partial<Scene>) {
    commitDocument((doc) => ({
      ...doc,
      scenes: doc.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    }));
  }

  function updateElementText(sceneId: string, elementId: string, text: string) {
    patchDocument((doc) => ({
      ...doc,
      scenes: doc.scenes.map((s) =>
        s.id === sceneId
          ? { ...s, elements: s.elements.map((e) => (e.id === elementId ? { ...e, text } : e)) }
          : s,
      ),
    }));
  }

  function setElementType(sceneId: string, elementId: string, type: ElementType) {
    commitDocument((doc) => ({
      ...doc,
      scenes: doc.scenes.map((s) =>
        s.id === sceneId
          ? { ...s, elements: s.elements.map((e) => (e.id === elementId ? { ...e, type } : e)) }
          : s,
      ),
    }));
  }

  function commitElement(sceneId: string, elementId: string) {
    commitDocument((doc) => {
      const withSplit = maybeSplitOnHeading(doc, sceneId, elementId);
      return resyncEntities(withSplit);
    });
  }

  function insertElementAfter(sceneId: string, elementId: string, type: ElementType) {
    const created = newElement(type, "");
    commitDocument((doc) => ({
      ...doc,
      scenes: doc.scenes.map((s) => {
        if (s.id !== sceneId) return s;
        const idx = s.elements.findIndex((e) => e.id === elementId);
        const elements = [...s.elements];
        elements.splice(idx + 1, 0, created);
        return { ...s, elements };
      }),
    }));
    focusElement(created.id);
  }

  function removeElement(sceneId: string, elementId: string) {
    const scene = document!.scenes.find((s) => s.id === sceneId);
    if (!scene || scene.elements.length <= 1) return;
    const idx = scene.elements.findIndex((e) => e.id === elementId);
    const prev = scene.elements[idx - 1];
    commitDocument((doc) => ({
      ...doc,
      scenes: doc.scenes.map((s) =>
        s.id === sceneId ? { ...s, elements: s.elements.filter((e) => e.id !== elementId) } : s,
      ),
    }));
    if (prev) focusElement(prev.id);
  }

  function addScene() {
    const lastAct = document!.acts[0]?.id ?? null;
    const created = newScene("INT. LOCATION - DAY", lastAct);
    commitDocument((doc) => ({ ...doc, scenes: [...doc.scenes, created] }));
    focusElement(created.elements[0].id);
  }

  async function deleteScene(sceneId: string) {
    if (document!.scenes.length <= 1) return;
    if (!(await confirmDialog("Delete this scene? Use Undo to bring it back.", { danger: true }))) return;
    commitDocument((doc) => ({ ...doc, scenes: doc.scenes.filter((s) => s.id !== sceneId) }));
  }

  const totalWords = document.scenes.reduce((sum, s) => sum + sceneWordCount(s), 0);
  const pageEstimate = Math.max(1, Math.round(totalWords / 235));

  return (
    <div className="editor-view">
      <ElementTypeBar
        activeType={activeElement?.type ?? null}
        onSelect={(type) => {
          if (!active) return;
          setElementType(active.sceneId, active.elementId, type);
          focusElement(active.elementId);
        }}
      />
      <div className="editor-scroll">
        <div className="page title-page">
          <div className="title-page-center">
            <input
              className="title-page-title"
              value={document.title}
              placeholder="Untitled Screenplay"
              onChange={(e) => updateDocumentField({ title: e.target.value })}
            />
            <input
              className="title-page-subtitle"
              value={document.subtitle}
              placeholder="Subtitle (optional)"
              onChange={(e) => updateDocumentField({ subtitle: e.target.value })}
            />
            <div className="title-page-by">
              <span>written by</span>
              <input
                className="title-page-author"
                value={document.author}
                placeholder="Author Name"
                onChange={(e) => updateDocumentField({ author: e.target.value })}
              />
            </div>
          </div>
          <input
            className="title-page-draft"
            value={document.draft}
            placeholder="Draft 1 — Month Year"
            onChange={(e) => updateDocumentField({ draft: e.target.value })}
          />
        </div>

        <div className="page">
          {document.scenes.map((scene, index) => {
            const act = document.acts.find((a) => a.id === scene.act_id);
            const bandColor = scene.color ?? act?.color ?? null;
            return (
            <div className="scene-block" id={`scene-${scene.id}`} key={scene.id}>
              <div
                className="scene-toolbar"
                style={{
                  background: tint(bandColor, 0.12, "var(--paper)"),
                  borderLeftColor: bandColor ?? "var(--line-strong)",
                }}
              >
                <div className="scene-toolbar-row">
                  <span className="scene-number">{index + 1}</span>
                  <SceneHeadingFields
                    heading={scene.heading}
                    locationSuggestions={allLocationNames}
                    onCommit={(newHeading) => updateSceneField(scene.id, { heading: newHeading })}
                  />
                  <span className="scene-toolbar-spacer" />
                  <input
                    type="color"
                    className="scene-color"
                    value={scene.color ?? "#ffffff"}
                    onChange={(e) => updateSceneField(scene.id, { color: e.target.value })}
                    title="Scene color"
                  />
                  <ActField
                    acts={document.acts}
                    value={scene.act_id}
                    onSelectExisting={(actId) => updateSceneField(scene.id, { act_id: actId })}
                    onClear={() => updateSceneField(scene.id, { act_id: null })}
                    onCreateNew={(name) => {
                      const created = { id: uuid(), name, color: null };
                      commitDocument((doc) => ({
                        ...doc,
                        acts: [...doc.acts, created],
                        scenes: doc.scenes.map((s) => (s.id === scene.id ? { ...s, act_id: created.id } : s)),
                      }));
                    }}
                  />
                  <button className="icon-button ghost danger" onClick={() => deleteScene(scene.id)} title="Delete scene">
                    <IconTrash size={15} />
                  </button>
                </div>
                <div className="scene-toolbar-row">
                  <input
                    className="scene-synopsis"
                    placeholder="Add a synopsis…"
                    value={scene.synopsis}
                    onChange={(e) => updateSceneField(scene.id, { synopsis: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                        if (scene.elements[0]) focusElement(scene.elements[0].id);
                      }
                    }}
                  />
                </div>
              </div>

              {scene.elements.map((el) => (
                <div className={`element-row element-${el.type}`} key={el.id}>
                  <ElementField
                    elementType={el.type}
                    className={`element-text el-${el.type}`}
                    value={el.text}
                    suggestions={
                      el.type === "character" ? allCharacterNames : el.type === "transition" ? allTransitions : undefined
                    }
                    fieldRef={(node) => {
                      refs.current[el.id] = node;
                    }}
                    onChange={(v) => updateElementText(scene.id, el.id, el.type === "character" ? v.toUpperCase() : v)}
                    onFocus={() => setActive({ sceneId: scene.id, elementId: el.id })}
                    onBlur={() => commitElement(scene.id, el.id)}
                    onKeyDown={(e: KeyboardEvent<FieldEl>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitElement(scene.id, el.id);
                        insertElementAfter(scene.id, el.id, nextElementType(el.type));
                      } else if (e.key === "Tab") {
                        e.preventDefault();
                        setElementType(scene.id, el.id, cycleType(el.type, e.shiftKey ? -1 : 1));
                        focusElement(el.id);
                      } else if (e.key === "Backspace" && el.text === "") {
                        e.preventDefault();
                        removeElement(scene.id, el.id);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            );
          })}
        </div>

        <button className="add-scene-button" onClick={addScene}>
          <IconPlus size={15} />
          Add Scene
        </button>
      </div>

      <div className="status-bar">
        <span>{document.scenes.length} scenes</span>
        <span>{totalWords.toLocaleString()} words</span>
        <span>~{pageEstimate} pages (estimate)</span>
        <span className="hint">
          Enter: next line · Tab/Shift+Tab or ⌘1-6: change type · Type INT./EXT. to split a new scene
        </span>
      </div>
    </div>
  );
}

export function estimatePages(scenes: Scene[]): number {
  const words = scenes.reduce((sum, s) => sum + s.elements.reduce((n, e) => n + wordCount(e.text), 0), 0);
  return Math.max(1, Math.round(words / 235));
}
