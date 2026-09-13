import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useStore } from "../store";
import type { Document, ElementType, Scene } from "../types";
import { ELEMENT_TYPE_CYCLE, ELEMENT_TYPE_LABELS, nextElementType } from "../types";
import { newElement, newScene, resyncEntities, sceneWordCount, tint, wordCount } from "../lib/model";
import { confirmDialog } from "../lib/dialog";
import { IconPlus, IconTrash } from "./icons";

const HEADING_PATTERN = /^(INT\.\/EXT\.|INT\/EXT|EXT\.\/INT\.|INT\.|EXT\.|EST\.|I\/E\.)\s*\S/i;
const COMMON_TRANSITIONS = ["CUT TO:", "DISSOLVE TO:", "SMASH CUT TO:", "FADE TO:", "FADE OUT."];

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
 * textarea; single-line types render as an <input> so native <datalist>
 * autocomplete works (the list attribute isn't functional on textarea). */
function ElementField({
  elementType,
  value,
  onChange,
  onKeyDown,
  onBlur,
  className,
  fieldRef,
  listId,
}: {
  elementType: ElementType;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<FieldEl>) => void;
  onBlur: () => void;
  className: string;
  fieldRef: (el: FieldEl | null) => void;
  listId?: string;
}) {
  if (SINGLE_LINE_TYPES.includes(elementType)) {
    return (
      <input
        ref={fieldRef}
        className={className}
        value={value}
        list={listId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
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
      onBlur={onBlur}
      spellCheck
    />
  );
}

export default function Editor() {
  const document = useStore((s) => s.document);
  const patchDocument = useStore((s) => s.patchDocument);
  const commitDocument = useStore((s) => s.commitDocument);
  const refs = useRef<Record<string, FieldEl | null>>({});

  if (!document) return null;

  const allHeadings = Array.from(new Set(document.scenes.map((s) => s.heading)));
  const allCharacterNames = document.characters.map((c) => c.name);
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
      <div className="editor-scroll">
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
                <span className="scene-number">{index + 1}</span>
                <input
                  className="scene-heading-input"
                  value={scene.heading}
                  list="heading-suggestions"
                  onChange={(e) => updateSceneField(scene.id, { heading: e.target.value.toUpperCase() })}
                />
                <input
                  className="scene-synopsis"
                  placeholder="Add a synopsis…"
                  value={scene.synopsis}
                  onChange={(e) => updateSceneField(scene.id, { synopsis: e.target.value })}
                />
                <input
                  type="color"
                  className="scene-color"
                  value={scene.color ?? "#ffffff"}
                  onChange={(e) => updateSceneField(scene.id, { color: e.target.value })}
                  title="Scene color"
                />
                <select
                  className="scene-act"
                  value={scene.act_id ?? ""}
                  onChange={(e) => updateSceneField(scene.id, { act_id: e.target.value || null })}
                  title="Act"
                >
                  <option value="">No act</option>
                  {document.acts.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.name}
                    </option>
                  ))}
                </select>
                <button className="icon-button ghost danger" onClick={() => deleteScene(scene.id)} title="Delete scene">
                  <IconTrash size={15} />
                </button>
              </div>

              {scene.elements.map((el) => (
                <div className={`element-row element-${el.type}`} key={el.id}>
                  <select
                    className="element-type-select"
                    value={el.type}
                    onChange={(e) => setElementType(scene.id, el.id, e.target.value as ElementType)}
                    title="Element type (or press Tab / Shift+Tab)"
                  >
                    {ELEMENT_TYPE_CYCLE.map((t) => (
                      <option key={t} value={t}>
                        {ELEMENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <ElementField
                    elementType={el.type}
                    className={`element-text el-${el.type}`}
                    value={el.text}
                    listId={
                      el.type === "character"
                        ? "character-suggestions"
                        : el.type === "transition"
                          ? "transition-suggestions"
                          : undefined
                    }
                    fieldRef={(node) => {
                      refs.current[el.id] = node;
                    }}
                    onChange={(v) => updateElementText(scene.id, el.id, el.type === "character" ? v.toUpperCase() : v)}
                    onBlur={() => commitElement(scene.id, el.id)}
                    onKeyDown={(e: KeyboardEvent<FieldEl>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        commitElement(scene.id, el.id);
                        insertElementAfter(scene.id, el.id, nextElementType(el.type));
                      } else if (e.key === "Tab") {
                        e.preventDefault();
                        setElementType(scene.id, el.id, cycleType(el.type, e.shiftKey ? -1 : 1));
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

          <button className="add-scene-button" onClick={addScene}>
            <IconPlus size={15} />
            Add Scene
          </button>
        </div>
      </div>

      <div className="status-bar">
        <span>{document.scenes.length} scenes</span>
        <span>{totalWords.toLocaleString()} words</span>
        <span>~{pageEstimate} pages (estimate)</span>
        <span className="hint">Enter: next line · Tab/Shift+Tab: change type · Type INT./EXT. to split a new scene</span>
      </div>

      <datalist id="heading-suggestions">
        {allHeadings.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
      <datalist id="character-suggestions">
        {allCharacterNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="transition-suggestions">
        {allTransitions.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

export function estimatePages(scenes: Scene[]): number {
  const words = scenes.reduce((sum, s) => sum + s.elements.reduce((n, e) => n + wordCount(e.text), 0), 0);
  return Math.max(1, Math.round(words / 235));
}
