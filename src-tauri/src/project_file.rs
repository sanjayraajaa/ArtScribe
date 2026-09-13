//! ArtScribe project file (.artscribe): a zip archive containing:
//!   - document.json   the full Document, versioned (F-FILE-1)
//!   - attachments/*    binary files referenced by the document
//!
//! This defines ArtScribe's own schema rather than targeting byte-level
//! compatibility with another screenwriting app's project format — see the
//! "Open decision" in docs/project-file-format.md.

use crate::model::Document;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use zip::write::SimpleFileOptions;
use zip::ZipArchive;

pub const DOCUMENT_ENTRY: &str = "document.json";

pub fn save(path: &Path, document: &Document, attachments: &[(String, Vec<u8>)]) -> Result<(), String> {
    let file = File::create(path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file(DOCUMENT_ENTRY, options)
        .map_err(|e| e.to_string())?;
    let json = serde_json::to_vec_pretty(document).map_err(|e| e.to_string())?;
    zip.write_all(&json).map_err(|e| e.to_string())?;

    for (archive_path, bytes) in attachments {
        zip.start_file(archive_path, options)
            .map_err(|e| e.to_string())?;
        zip.write_all(bytes).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load(path: &Path) -> Result<Document, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut entry = archive
        .by_name(DOCUMENT_ENTRY)
        .map_err(|_| "Not a valid ArtScribe project file (missing document.json)".to_string())?;
    let mut contents = String::new();
    entry
        .read_to_string(&mut contents)
        .map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| format!("Could not parse project file: {e}"))
}

pub fn load_attachment(path: &Path, archive_path: &str) -> Result<Vec<u8>, String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut entry = archive.by_name(archive_path).map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    entry.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
    Ok(bytes)
}
