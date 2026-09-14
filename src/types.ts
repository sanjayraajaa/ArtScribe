export type ElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "shot";

export interface ScreenplayElement {
  id: string;
  type: ElementType;
  text: string;
}

export interface Scene {
  id: string;
  heading: string;
  elements: ScreenplayElement[];
  color: string | null;
  act_id: string | null;
  synopsis: string;
  board_x: number;
  board_y: number;
}

export interface Act {
  id: string;
  name: string;
  color: string | null;
}

export interface Character {
  id: string;
  name: string;
  color: string | null;
}

export interface Location {
  id: string;
  name: string;
}

export interface Relationship {
  id: string;
  character_a: string;
  character_b: string;
  label: string;
}

export type NoteTarget =
  | { kind: "Document" }
  | { kind: "Character"; id: string }
  | { kind: "Location"; id: string }
  | { kind: "Scene"; id: string };

export interface Note {
  id: string;
  title: string;
  body_html: string;
  attached_to: NoteTarget;
}

export interface FormattingProfile {
  font_family: string;
  font_size_pt: number;
  page_width_in: number;
  page_height_in: number;
  margin_top_in: number;
  margin_bottom_in: number;
  margin_left_in: number;
  margin_right_in: number;
  lines_per_page: number;
}

export interface Attachment {
  id: string;
  file_name: string;
  archive_path: string;
}

export interface Document {
  id: string;
  schema_version: number;
  title: string;
  subtitle: string;
  author: string;
  draft: string;
  language: string;
  scenes: Scene[];
  acts: Act[];
  characters: Character[];
  locations: Location[];
  relationships: Relationship[];
  notes: Note[];
  attachments: Attachment[];
  formatting: FormattingProfile;
}

export interface CharacterReportRow {
  scene_id: string;
  scene_heading: string;
  line_count: number;
  notes: string[];
}

export interface CharacterReport {
  character_name: string;
  rows: CharacterReportRow[];
  total_lines: number;
}

export interface LocationReportRow {
  scene_id: string;
  scene_heading: string;
  notes: string[];
}

export interface LocationReport {
  location_name: string;
  rows: LocationReportRow[];
}

export interface CharacterScreenTime {
  character_name: string;
  scene_count: number;
  dialogue_words: number;
}

export interface StatisticsReport {
  scene_count: number;
  page_estimate: number;
  total_words: number;
  dialogue_words: number;
  action_words: number;
  dialogue_to_action_ratio: number;
  character_screen_time: CharacterScreenTime[];
}

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
  shot: "Shot",
};

export const ELEMENT_TYPE_CYCLE: ElementType[] = [
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
];

export function nextElementType(current: ElementType): ElementType {
  switch (current) {
    case "character":
      return "dialogue";
    case "dialogue":
      return "action";
    case "parenthetical":
      return "dialogue";
    case "transition":
      return "action";
    case "shot":
      return "action";
    default:
      return "action";
  }
}
