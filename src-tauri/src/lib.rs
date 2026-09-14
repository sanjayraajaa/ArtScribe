mod commands;
mod fountain;
mod model;
mod pdf;
mod project_file;
mod reports;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::new_document,
            commands::open_document,
            commands::save_document,
            commands::get_current_path,
            commands::get_recent_files,
            commands::autosave,
            commands::check_recovery,
            commands::discard_recovery,
            commands::import_fountain,
            commands::export_fountain,
            commands::export_plain_text,
            commands::export_html,
            commands::export_pdf,
            commands::resync_entities,
            commands::get_character_report,
            commands::get_location_report,
            commands::get_statistics_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
