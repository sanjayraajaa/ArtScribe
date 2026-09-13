//! Minimal Fountain (https://fountain.io) import/export.
//! Covers the Must-have subset: scene headings, action, character,
//! dialogue, parenthetical, and transitions. Title-page metadata and
//! the less common syntax (dual dialogue, sections/synopses-as-comments)
//! are intentionally out of scope for v1.

use crate::model::{Document, ElementType, Scene, ScreenplayElement};

pub fn export(document: &Document) -> String {
    let mut out = String::new();
    out.push_str(&format!("Title: {}\n", document.title));
    out.push_str("\n===\n\n");

    for scene in &document.scenes {
        out.push_str(&scene.heading.to_uppercase());
        out.push_str("\n\n");

        for element in &scene.elements {
            match element.element_type {
                ElementType::SceneHeading => continue,
                ElementType::Action => {
                    if !element.text.trim().is_empty() {
                        out.push_str(&element.text);
                        out.push_str("\n\n");
                    }
                }
                ElementType::Character => {
                    out.push_str(&element.text.to_uppercase());
                    out.push('\n');
                }
                ElementType::Parenthetical => {
                    out.push('(');
                    out.push_str(element.text.trim_matches(|c| c == '(' || c == ')'));
                    out.push(')');
                    out.push('\n');
                }
                ElementType::Dialogue => {
                    out.push_str(&element.text);
                    out.push_str("\n\n");
                }
                ElementType::Transition => {
                    out.push_str(&element.text.to_uppercase());
                    out.push_str("\n\n");
                }
                ElementType::Shot => {
                    out.push_str(&element.text.to_uppercase());
                    out.push_str("\n\n");
                }
            }
        }
    }

    out
}

fn is_scene_heading(line: &str) -> bool {
    let upper = line.trim().to_uppercase();
    upper.starts_with("INT.")
        || upper.starts_with("EXT.")
        || upper.starts_with("INT/EXT")
        || upper.starts_with("INT./EXT")
        || upper.starts_with("EST.")
        || upper.starts_with("I/E.")
}

fn is_transition(line: &str) -> bool {
    let upper = line.trim().to_uppercase();
    (upper.ends_with("TO:") && upper == line.trim()) || upper == "FADE OUT." || upper == "FADE IN:"
}

fn is_all_caps_word(line: &str) -> bool {
    let trimmed = line.trim();
    !trimmed.is_empty()
        && trimmed
            .chars()
            .filter(|c| c.is_alphabetic())
            .all(|c| c.is_uppercase())
        && trimmed.chars().any(|c| c.is_alphabetic())
}

pub fn import(source: &str, title: &str) -> Document {
    let mut document = Document::new(title);
    document.scenes.clear();

    let lines: Vec<&str> = source.lines().collect();
    let mut i = 0usize;

    // Skip a leading title page block (key: value lines followed by a blank
    // line and/or a "===" separator), which Fountain uses for metadata.
    while i < lines.len() {
        let line = lines[i].trim();
        if line == "===" {
            i += 1;
            break;
        }
        if line.is_empty() {
            i += 1;
            continue;
        }
        if line.contains(':') && !is_scene_heading(line) {
            i += 1;
            continue;
        }
        break;
    }

    let mut current_scene: Option<Scene> = None;
    let mut pending_character = false;

    let flush_scene = |doc: &mut Document, scene: Option<Scene>| {
        if let Some(scene) = scene {
            doc.scenes.push(scene);
        }
    };

    while i < lines.len() {
        let raw_line = lines[i];
        let line = raw_line.trim_end();
        let trimmed = line.trim();
        i += 1;

        if trimmed.is_empty() {
            pending_character = false;
            continue;
        }

        if is_scene_heading(trimmed) {
            flush_scene(&mut document, current_scene.take());
            current_scene = Some(Scene::new(trimmed.to_string()));
            pending_character = false;
            continue;
        }

        if current_scene.is_none() {
            current_scene = Some(Scene::new("INT. LOCATION - DAY"));
        }
        let scene = current_scene.as_mut().unwrap();

        if is_transition(trimmed) {
            scene
                .elements
                .push(ScreenplayElement::new(ElementType::Transition, trimmed));
            pending_character = false;
            continue;
        }

        if trimmed.starts_with('(') && trimmed.ends_with(')') {
            scene
                .elements
                .push(ScreenplayElement::new(ElementType::Parenthetical, trimmed));
            continue;
        }

        if is_all_caps_word(trimmed) && trimmed.len() < 40 {
            scene
                .elements
                .push(ScreenplayElement::new(ElementType::Character, trimmed));
            pending_character = true;
            continue;
        }

        if pending_character {
            scene
                .elements
                .push(ScreenplayElement::new(ElementType::Dialogue, trimmed));
            continue;
        }

        scene
            .elements
            .push(ScreenplayElement::new(ElementType::Action, trimmed));
    }
    flush_scene(&mut document, current_scene.take());

    if document.scenes.is_empty() {
        document.scenes.push(Scene::new("INT. LOCATION - DAY"));
    }

    let default_act = document.acts.first().map(|a| a.id);
    for scene in &mut document.scenes {
        scene.act_id = default_act;
    }

    document.resync_entities();
    document
}
