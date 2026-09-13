use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::model::Document;

pub struct AppState {
    pub inner: Mutex<AppData>,
}

pub struct AppData {
    pub current_path: Option<PathBuf>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(AppData { current_path: None }),
        }
    }
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct RecentFiles {
    pub paths: Vec<String>,
}

const RECENT_FILES_NAME: &str = "recent-files.json";
const RECOVERY_NAME: &str = "recovery.json";

fn config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    use tauri::Manager;
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn load_recent_files(app: &tauri::AppHandle) -> Result<Vec<String>, String> {
    let path = config_dir(app)?.join(RECENT_FILES_NAME);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let contents = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let recent: RecentFiles = serde_json::from_str(&contents).unwrap_or_default();
    Ok(recent.paths)
}

pub fn push_recent_file(app: &tauri::AppHandle, file_path: &str) -> Result<(), String> {
    let mut paths = load_recent_files(app)?;
    paths.retain(|p| p != file_path);
    paths.insert(0, file_path.to_string());
    paths.truncate(10);
    let path = config_dir(app)?.join(RECENT_FILES_NAME);
    let json = serde_json::to_string_pretty(&RecentFiles { paths }).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

pub fn write_recovery(app: &tauri::AppHandle, document: &Document, file_path: Option<&str>) -> Result<(), String> {
    #[derive(Serialize)]
    struct Recovery<'a> {
        document: &'a Document,
        file_path: Option<&'a str>,
    }
    let path = config_dir(app)?.join(RECOVERY_NAME);
    let json = serde_json::to_string(&Recovery { document, file_path }).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecoveryPayload {
    pub document: Document,
    pub file_path: Option<String>,
}

pub fn read_recovery(app: &tauri::AppHandle) -> Result<Option<RecoveryPayload>, String> {
    let path = config_dir(app)?.join(RECOVERY_NAME);
    if !path.exists() {
        return Ok(None);
    }
    let contents = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let payload: RecoveryPayload = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(Some(payload))
}

pub fn clear_recovery(app: &tauri::AppHandle) -> Result<(), String> {
    let path = config_dir(app)?.join(RECOVERY_NAME);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
