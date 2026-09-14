use std::path::PathBuf;

use tauri::State;
use uuid::Uuid;

use crate::model::Document;
use crate::state::{self, AppState};
use crate::{fountain, pdf, project_file, reports};

#[tauri::command]
pub fn new_document(state: State<AppState>) -> Document {
    let mut data = state.inner.lock().unwrap();
    data.current_path = None;
    Document::new("Untitled Screenplay")
}

#[tauri::command]
pub fn open_document(state: State<AppState>, path: String) -> Result<Document, String> {
    let document = project_file::load(&PathBuf::from(&path))?;
    let mut data = state.inner.lock().unwrap();
    data.current_path = Some(PathBuf::from(&path));
    Ok(document)
}

#[tauri::command]
pub fn save_document(
    app: tauri::AppHandle,
    state: State<AppState>,
    path: String,
    document: Document,
) -> Result<(), String> {
    project_file::save(&PathBuf::from(&path), &document, &[])?;
    let mut data = state.inner.lock().unwrap();
    data.current_path = Some(PathBuf::from(&path));
    drop(data);
    state::push_recent_file(&app, &path)?;
    state::clear_recovery(&app)?;
    Ok(())
}

#[tauri::command]
pub fn get_current_path(state: State<AppState>) -> Option<String> {
    let data = state.inner.lock().unwrap();
    data.current_path.as_ref().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_recent_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    state::load_recent_files(&app)
}

#[tauri::command]
pub fn autosave(app: tauri::AppHandle, state: State<AppState>, document: Document) -> Result<(), String> {
    let data = state.inner.lock().unwrap();
    let file_path = data.current_path.as_ref().map(|p| p.to_string_lossy().to_string());
    state::write_recovery(&app, &document, file_path.as_deref())
}

#[tauri::command]
pub fn check_recovery(app: tauri::AppHandle) -> Result<Option<state::RecoveryPayload>, String> {
    state::read_recovery(&app)
}

#[tauri::command]
pub fn discard_recovery(app: tauri::AppHandle) -> Result<(), String> {
    state::clear_recovery(&app)
}

#[tauri::command]
pub fn import_fountain(path: String) -> Result<Document, String> {
    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let title = PathBuf::from(&path)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "Untitled Screenplay".to_string());
    Ok(fountain::import(&contents, &title))
}

#[tauri::command]
pub fn export_fountain(path: String, document: Document) -> Result<(), String> {
    let text = fountain::export(&document);
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_plain_text(path: String, document: Document) -> Result<(), String> {
    // Fountain source doubles as clean plain text for v1.
    let text = fountain::export(&document);
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_html(path: String, document: Document) -> Result<(), String> {
    let mut html = String::new();
    html.push_str("<!doctype html><html><head><meta charset=\"utf-8\"><title>");
    html.push_str(&document.title);
    html.push_str("</title><style>body{font-family:'Courier Prime','Courier New',monospace;max-width:6.5in;margin:1in auto;white-space:pre-wrap} .scene-heading{font-weight:bold;margin-top:2em} .character{margin-left:2in;margin-top:1em} .dialogue{margin-left:1in;max-width:3.5in} .parenthetical{margin-left:1.5in} .transition{text-align:right}</style></head><body>");
    for scene in &document.scenes {
        html.push_str(&format!("<div class=\"scene-heading\">{}</div>", escape_html(&scene.heading)));
        for el in &scene.elements {
            let class = match el.element_type {
                crate::model::ElementType::Action => "action",
                crate::model::ElementType::Character => "character",
                crate::model::ElementType::Dialogue => "dialogue",
                crate::model::ElementType::Parenthetical => "parenthetical",
                crate::model::ElementType::Transition => "transition",
                crate::model::ElementType::Shot => "shot",
                crate::model::ElementType::SceneHeading => continue,
            };
            html.push_str(&format!("<div class=\"{}\">{}</div>", class, escape_html(&el.text)));
        }
    }
    html.push_str("</body></html>");
    std::fs::write(&path, html).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn export_pdf(path: String, document: Document) -> Result<(), String> {
    pdf::export(&document, &PathBuf::from(&path))
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

#[tauri::command]
pub fn resync_entities(mut document: Document) -> Document {
    document.resync_entities();
    document
}

#[tauri::command]
pub fn get_character_report(document: Document, character_id: Uuid) -> Result<reports::CharacterReport, String> {
    reports::character_report(&document, character_id)
}

#[tauri::command]
pub fn get_location_report(document: Document, location_id: Uuid) -> Result<reports::LocationReport, String> {
    reports::location_report(&document, location_id)
}

#[tauri::command]
pub fn get_statistics_report(document: Document) -> reports::StatisticsReport {
    reports::statistics_report(&document)
}
