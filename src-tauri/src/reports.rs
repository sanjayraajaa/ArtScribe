use crate::model::{normalize_name, Document, ElementType};
use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct CharacterReportRow {
    pub scene_id: Uuid,
    pub scene_heading: String,
    pub line_count: usize,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct CharacterReport {
    pub character_name: String,
    pub rows: Vec<CharacterReportRow>,
    pub total_lines: usize,
}

pub fn character_report(document: &Document, character_id: Uuid) -> Result<CharacterReport, String> {
    let character = document
        .characters
        .iter()
        .find(|c| c.id == character_id)
        .ok_or("Character not found")?;
    let target_name = normalize_name(&character.name);

    let mut rows = Vec::new();
    let mut total_lines = 0usize;

    for scene in &document.scenes {
        // Count dialogue lines following each matching character cue.
        let mut dialogue_lines = 0usize;
        let mut speaking = false;
        for el in &scene.elements {
            match el.element_type {
                ElementType::Character => {
                    speaking = normalize_name(&el.text) == target_name;
                }
                ElementType::Dialogue if speaking => {
                    dialogue_lines += el.text.split('\n').count().max(1);
                }
                ElementType::Parenthetical => {}
                _ => speaking = false,
            }
        }

        if dialogue_lines > 0 {
            let notes: Vec<String> = document
                .notes
                .iter()
                .filter(|n| matches!(&n.attached_to, crate::model::NoteTarget::Scene(id) if *id == scene.id))
                .map(|n| n.title.clone())
                .collect();
            total_lines += dialogue_lines;
            rows.push(CharacterReportRow {
                scene_id: scene.id,
                scene_heading: scene.heading.clone(),
                line_count: dialogue_lines,
                notes,
            });
        }
    }

    Ok(CharacterReport {
        character_name: character.name.clone(),
        rows,
        total_lines,
    })
}

#[derive(Debug, Serialize)]
pub struct LocationReportRow {
    pub scene_id: Uuid,
    pub scene_heading: String,
    pub notes: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct LocationReport {
    pub location_name: String,
    pub rows: Vec<LocationReportRow>,
}

pub fn location_report(document: &Document, location_id: Uuid) -> Result<LocationReport, String> {
    let location = document
        .locations
        .iter()
        .find(|l| l.id == location_id)
        .ok_or("Location not found")?;
    let target = normalize_name(&location.name);

    let rows = document
        .scenes
        .iter()
        .filter(|scene| scene.heading.to_uppercase().contains(&target))
        .map(|scene| LocationReportRow {
            scene_id: scene.id,
            scene_heading: scene.heading.clone(),
            notes: document
                .notes
                .iter()
                .filter(|n| matches!(&n.attached_to, crate::model::NoteTarget::Scene(id) if *id == scene.id))
                .map(|n| n.title.clone())
                .collect(),
        })
        .collect();

    Ok(LocationReport {
        location_name: location.name.clone(),
        rows,
    })
}

#[derive(Debug, Serialize)]
pub struct CharacterScreenTime {
    pub character_name: String,
    pub scene_count: usize,
    pub dialogue_words: usize,
}

#[derive(Debug, Serialize)]
pub struct StatisticsReport {
    pub scene_count: usize,
    pub page_estimate: f32,
    pub total_words: usize,
    pub dialogue_words: usize,
    pub action_words: usize,
    pub dialogue_to_action_ratio: f32,
    pub character_screen_time: Vec<CharacterScreenTime>,
}

pub fn statistics_report(document: &Document) -> StatisticsReport {
    let mut total_words = 0usize;
    let mut dialogue_words = 0usize;
    let mut action_words = 0usize;

    for scene in &document.scenes {
        total_words += scene.word_count();
        dialogue_words += scene.dialogue_word_count();
        action_words += scene.action_word_count();
    }

    let page_estimate = total_words as f32 / 235.0; // ~235 words/page is a common screenplay rule of thumb
    let ratio = if action_words == 0 {
        0.0
    } else {
        dialogue_words as f32 / action_words as f32
    };

    let mut screen_time: Vec<CharacterScreenTime> = document
        .characters
        .iter()
        .map(|c| {
            let name = normalize_name(&c.name);
            let mut scene_count = 0usize;
            let mut words = 0usize;
            for scene in &document.scenes {
                if scene.characters_present().contains(&name) {
                    scene_count += 1;
                }
                let mut speaking = false;
                for el in &scene.elements {
                    match el.element_type {
                        ElementType::Character => speaking = normalize_name(&el.text) == name,
                        ElementType::Dialogue if speaking => {
                            words += el.text.split_whitespace().count();
                        }
                        ElementType::Parenthetical => {}
                        _ => speaking = false,
                    }
                }
            }
            CharacterScreenTime {
                character_name: c.name.clone(),
                scene_count,
                dialogue_words: words,
            }
        })
        .collect();
    screen_time.sort_by(|a, b| b.dialogue_words.cmp(&a.dialogue_words));

    StatisticsReport {
        scene_count: document.scenes.len(),
        page_estimate,
        total_words,
        dialogue_words,
        action_words,
        dialogue_to_action_ratio: ratio,
        character_screen_time: screen_time,
    }
}
