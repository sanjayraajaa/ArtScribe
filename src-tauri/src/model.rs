use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ElementType {
    SceneHeading,
    Action,
    Character,
    Dialogue,
    Parenthetical,
    Transition,
    Shot,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenplayElement {
    pub id: Uuid,
    #[serde(rename = "type")]
    pub element_type: ElementType,
    pub text: String,
}

impl ScreenplayElement {
    pub fn new(element_type: ElementType, text: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            element_type,
            text: text.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: Uuid,
    pub heading: String,
    pub elements: Vec<ScreenplayElement>,
    pub color: Option<String>,
    pub act_id: Option<Uuid>,
    pub synopsis: String,
    /// Free position on the Structure board (independent of screenplay order).
    pub board_x: f64,
    pub board_y: f64,
}

impl Scene {
    pub fn new(heading: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            heading: heading.into(),
            elements: Vec::new(),
            color: None,
            act_id: None,
            synopsis: String::new(),
            board_x: 0.0,
            board_y: 0.0,
        }
    }

    pub fn word_count(&self) -> usize {
        self.elements
            .iter()
            .map(|e| e.text.split_whitespace().count())
            .sum()
    }

    pub fn dialogue_word_count(&self) -> usize {
        self.elements
            .iter()
            .filter(|e| matches!(e.element_type, ElementType::Dialogue))
            .map(|e| e.text.split_whitespace().count())
            .sum()
    }

    pub fn action_word_count(&self) -> usize {
        self.elements
            .iter()
            .filter(|e| matches!(e.element_type, ElementType::Action))
            .map(|e| e.text.split_whitespace().count())
            .sum()
    }

    pub fn characters_present(&self) -> Vec<String> {
        let mut names: Vec<String> = self
            .elements
            .iter()
            .filter(|e| matches!(e.element_type, ElementType::Character))
            .map(|e| normalize_name(&e.text))
            .collect();
        names.sort();
        names.dedup();
        names
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Act {
    pub id: Uuid,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: Uuid,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub id: Uuid,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    pub id: Uuid,
    pub character_a: Uuid,
    pub character_b: Uuid,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", content = "id")]
pub enum NoteTarget {
    Document,
    Character(Uuid),
    Location(Uuid),
    Scene(Uuid),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: Uuid,
    pub title: String,
    /// Rich text body, authored as HTML by the WebView's contenteditable notes editor.
    pub body_html: String,
    pub attached_to: NoteTarget,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormattingProfile {
    pub font_family: String,
    pub font_size_pt: f32,
    pub page_width_in: f32,
    pub page_height_in: f32,
    pub margin_top_in: f32,
    pub margin_bottom_in: f32,
    pub margin_left_in: f32,
    pub margin_right_in: f32,
    pub lines_per_page: u32,
}

impl Default for FormattingProfile {
    /// Standard US screenplay formatting: 12pt Courier, 8.5x11in, 1in margins.
    fn default() -> Self {
        Self {
            font_family: "Courier Prime, Courier New, monospace".into(),
            font_size_pt: 12.0,
            page_width_in: 8.5,
            page_height_in: 11.0,
            margin_top_in: 1.0,
            margin_bottom_in: 1.0,
            margin_left_in: 1.5,
            margin_right_in: 1.0,
            lines_per_page: 55,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: Uuid,
    pub file_name: String,
    /// Path inside the project archive, e.g. "attachments/<id>-<file_name>"
    pub archive_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: Uuid,
    pub schema_version: u32,
    pub title: String,
    pub language: String,
    pub scenes: Vec<Scene>,
    pub acts: Vec<Act>,
    pub characters: Vec<Character>,
    pub locations: Vec<Location>,
    pub relationships: Vec<Relationship>,
    pub notes: Vec<Note>,
    pub attachments: Vec<Attachment>,
    pub formatting: FormattingProfile,
}

impl Document {
    pub fn new(title: impl Into<String>) -> Self {
        let act_one = Act {
            id: Uuid::new_v4(),
            name: "Act 1".into(),
            color: Some("#8C2E22".into()),
        };
        let act_two = Act {
            id: Uuid::new_v4(),
            name: "Act 2".into(),
            color: Some("#2B4E7C".into()),
        };
        let act_three = Act {
            id: Uuid::new_v4(),
            name: "Act 3".into(),
            color: Some("#3F6B4A".into()),
        };
        let mut scene = Scene::new("INT. LOCATION - DAY");
        scene.act_id = Some(act_one.id);
        scene
            .elements
            .push(ScreenplayElement::new(ElementType::Action, ""));

        Self {
            id: Uuid::new_v4(),
            schema_version: SCHEMA_VERSION,
            title: title.into(),
            language: "en".into(),
            scenes: vec![scene],
            acts: vec![act_one, act_two, act_three],
            characters: Vec::new(),
            locations: Vec::new(),
            relationships: Vec::new(),
            notes: Vec::new(),
            attachments: Vec::new(),
            formatting: FormattingProfile::default(),
        }
    }

    /// Re-derives the characters/locations entity lists from what's actually
    /// used in the screenplay (F-DOC-3). Existing entities are kept (so
    /// colors/metadata survive); newly-seen names are appended.
    pub fn resync_entities(&mut self) {
        let mut seen_characters: Vec<String> = Vec::new();
        let mut seen_locations: Vec<String> = Vec::new();

        for scene in &self.scenes {
            for name in scene.characters_present() {
                if !seen_characters.contains(&name) {
                    seen_characters.push(name);
                }
            }
            if let Some(loc) = extract_location(&scene.heading) {
                if !seen_locations.contains(&loc) {
                    seen_locations.push(loc);
                }
            }
        }

        self.characters
            .retain(|c| seen_characters.contains(&normalize_name(&c.name)));
        for name in &seen_characters {
            if !self
                .characters
                .iter()
                .any(|c| &normalize_name(&c.name) == name)
            {
                self.characters.push(Character {
                    id: Uuid::new_v4(),
                    name: name.clone(),
                    color: None,
                });
            }
        }

        self.locations
            .retain(|l| seen_locations.contains(&normalize_name(&l.name)));
        for name in &seen_locations {
            if !self
                .locations
                .iter()
                .any(|l| &normalize_name(&l.name) == name)
            {
                self.locations.push(Location {
                    id: Uuid::new_v4(),
                    name: name.clone(),
                });
            }
        }
    }
}

pub fn normalize_name(raw: &str) -> String {
    raw.trim()
        .trim_end_matches('.')
        .split('(')
        .next()
        .unwrap_or("")
        .trim()
        .to_uppercase()
}

/// Best-effort location extraction from a scene heading like
/// "INT. COFFEE SHOP - DAY" -> "COFFEE SHOP".
fn extract_location(heading: &str) -> Option<String> {
    let upper = heading.to_uppercase();
    let without_prefix = upper
        .trim_start_matches("INT./EXT.")
        .trim_start_matches("INT/EXT")
        .trim_start_matches("EXT./INT.")
        .trim_start_matches("INT.")
        .trim_start_matches("EXT.")
        .trim_start_matches("INT")
        .trim_start_matches("EXT")
        .trim_start_matches('.')
        .trim();
    if without_prefix.is_empty() {
        return None;
    }
    let location_part = without_prefix.split(" - ").next().unwrap_or("").trim();
    if location_part.is_empty() {
        None
    } else {
        Some(location_part.to_string())
    }
}
