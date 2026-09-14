import { invoke } from "@tauri-apps/api/core";
import type {
  CharacterReport,
  Document,
  LocationReport,
  StatisticsReport,
} from "./types";

export interface RecoveryPayload {
  document: Document;
  file_path: string | null;
}

export const api = {
  newDocument: () => invoke<Document>("new_document"),

  openDocument: (path: string) => invoke<Document>("open_document", { path }),

  saveDocument: (path: string, document: Document) =>
    invoke<void>("save_document", { path, document }),

  getCurrentPath: () => invoke<string | null>("get_current_path"),

  getRecentFiles: () => invoke<string[]>("get_recent_files"),

  autosave: (document: Document) => invoke<void>("autosave", { document }),

  checkRecovery: () => invoke<RecoveryPayload | null>("check_recovery"),

  discardRecovery: () => invoke<void>("discard_recovery"),

  importFountain: (path: string) => invoke<Document>("import_fountain", { path }),

  exportFountain: (path: string, document: Document) =>
    invoke<void>("export_fountain", { path, document }),

  exportPlainText: (path: string, document: Document) =>
    invoke<void>("export_plain_text", { path, document }),

  exportHtml: (path: string, document: Document) =>
    invoke<void>("export_html", { path, document }),

  exportPdf: (path: string, document: Document) =>
    invoke<void>("export_pdf", { path, document }),

  resyncEntities: (document: Document) => invoke<Document>("resync_entities", { document }),

  getCharacterReport: (document: Document, characterId: string) =>
    invoke<CharacterReport>("get_character_report", { document, characterId }),

  getLocationReport: (document: Document, locationId: string) =>
    invoke<LocationReport>("get_location_report", { document, locationId }),

  getStatisticsReport: (document: Document) =>
    invoke<StatisticsReport>("get_statistics_report", { document }),
};
