import type { Document, ElementType, Note, NoteTarget, Scene, ScreenplayElement } from "../types";

export function uuid(): string {
  return crypto.randomUUID();
}

export function newElement(type: ElementType, text = ""): ScreenplayElement {
  return { id: uuid(), type, text };
}

export function newScene(heading = "INT. LOCATION - DAY", actId: string | null = null): Scene {
  return {
    id: uuid(),
    heading,
    elements: [newElement("action", "")],
    color: null,
    act_id: actId,
    synopsis: "",
    board_x: 40,
    board_y: 40,
  };
}

export function newNote(title: string, attachedTo: NoteTarget): Note {
  return {
    id: uuid(),
    title,
    body_html: "",
    attached_to: attachedTo,
  };
}

export function normalizeName(raw: string): string {
  return raw
    .trim()
    .replace(/\.$/, "")
    .split("(")[0]
    .trim()
    .toUpperCase();
}

/** Mirrors the Rust Document::resync_entities logic on the frontend so the
 * character/location lists stay live while typing, without a round trip. */
export function resyncEntities(doc: Document): Document {
  const seenCharacters: string[] = [];
  const seenLocations: string[] = [];

  for (const scene of doc.scenes) {
    for (const el of scene.elements) {
      if (el.type === "character") {
        const name = normalizeName(el.text);
        if (name && !seenCharacters.includes(name)) seenCharacters.push(name);
      }
    }
    const loc = extractLocation(scene.heading);
    if (loc && !seenLocations.includes(loc)) seenLocations.push(loc);
  }

  const characters = doc.characters.filter((c) => seenCharacters.includes(normalizeName(c.name)));
  for (const name of seenCharacters) {
    if (!characters.some((c) => normalizeName(c.name) === name)) {
      characters.push({ id: uuid(), name, color: null });
    }
  }

  const locations = doc.locations.filter((l) => seenLocations.includes(normalizeName(l.name)));
  for (const name of seenLocations) {
    if (!locations.some((l) => normalizeName(l.name) === name)) {
      locations.push({ id: uuid(), name });
    }
  }

  return { ...doc, characters, locations };
}

function extractLocation(heading: string): string | null {
  const upper = heading.toUpperCase();
  const withoutPrefix = upper.replace(/^(INT\.\/EXT\.|INT\/EXT|EXT\.\/INT\.|INT\.|EXT\.|INT|EXT)\.?\s*/, "").trim();
  if (!withoutPrefix) return null;
  const part = withoutPrefix.split(" - ")[0]?.trim();
  return part || null;
}

/** Light tint of a hex color for use as a subtle background band, with a
 * graceful fallback for malformed/missing colors. */
export function tint(hex: string | null | undefined, alpha: number, fallback = "transparent"): string {
  if (!hex) return fallback;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return fallback;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function sceneWordCount(scene: Scene): number {
  return scene.elements.reduce((sum, el) => sum + wordCount(el.text), 0);
}
