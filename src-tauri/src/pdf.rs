//! PDF export (F-EXP-1) via direct Rust-side rendering — not the WebView's
//! print-to-PDF dialog, which is unreliable across Tauri's WebView engines.
//! Courier is a fixed-pitch font, so column widths are computed in
//! characters rather than measured, and wrapped with a simple greedy
//! word-wrap.

use crate::model::{Document, ElementType};
use printpdf::*;
use std::path::Path;

const PAGE_WIDTH_MM: f32 = 215.9; // 8.5in
const PAGE_HEIGHT_MM: f32 = 279.4; // 11in
const MARGIN_TOP_MM: f32 = 25.4;
const MARGIN_BOTTOM_MM: f32 = 25.4;
const MARGIN_LEFT_MM: f32 = 38.1; // 1.5in, standard screenplay binding margin
const MARGIN_RIGHT_MM: f32 = 25.4;
const FONT_SIZE_PT: f32 = 12.0;
const MM_PER_PT: f32 = 25.4 / 72.0;
const LINE_HEIGHT_MM: f32 = 25.4 / 6.0; // 6 lines/inch, standard screenplay spacing

const ACTION_WIDTH_CH: usize = 60;
const CHARACTER_INDENT_MM: f32 = 2.2 * 25.4;
const DIALOGUE_INDENT_MM: f32 = 1.0 * 25.4;
const DIALOGUE_WIDTH_CH: usize = 35;
const PAREN_INDENT_MM: f32 = 1.5 * 25.4;
const PAREN_WIDTH_CH: usize = 25;

/// Courier's glyphs are exactly 0.6em wide at any size.
fn char_width_mm(font_size_pt: f32) -> f32 {
    font_size_pt * 0.6 * MM_PER_PT
}

fn black() -> Color {
    Color::Rgb(Rgb {
        r: 0.0,
        g: 0.0,
        b: 0.0,
        icc_profile: None,
    })
}

fn wrap(text: &str, max_chars: usize) -> Vec<String> {
    if max_chars == 0 {
        return vec![text.to_string()];
    }
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        if paragraph.trim().is_empty() {
            lines.push(String::new());
            continue;
        }
        let mut current = String::new();
        for word in paragraph.split_whitespace() {
            let candidate_len = if current.is_empty() {
                word.chars().count()
            } else {
                current.chars().count() + 1 + word.chars().count()
            };
            if candidate_len > max_chars && !current.is_empty() {
                lines.push(std::mem::take(&mut current));
            }
            if !current.is_empty() {
                current.push(' ');
            }
            current.push_str(word);
            while current.chars().count() > max_chars {
                let split_at = current
                    .char_indices()
                    .nth(max_chars)
                    .map(|(i, _)| i)
                    .unwrap_or(current.len());
                let rest = current.split_off(split_at);
                lines.push(std::mem::replace(&mut current, rest));
            }
        }
        lines.push(current);
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}

struct PageBuilder {
    pages: Vec<PdfPage>,
    ops: Vec<Op>,
    y_mm: f32,
    page_number: u32,
}

impl PageBuilder {
    fn new() -> Self {
        let mut b = PageBuilder {
            pages: Vec::new(),
            ops: vec![Op::StartTextSection],
            y_mm: PAGE_HEIGHT_MM - MARGIN_TOP_MM,
            page_number: 1,
        };
        b.write_page_number();
        b
    }

    fn write_page_number(&mut self) {
        if self.page_number <= 1 {
            return;
        }
        let text = format!("{}.", self.page_number);
        let x = PAGE_WIDTH_MM - MARGIN_RIGHT_MM - (text.chars().count() as f32 * char_width_mm(FONT_SIZE_PT));
        let y = PAGE_HEIGHT_MM - MARGIN_TOP_MM + LINE_HEIGHT_MM;
        self.ops.push(Op::SetTextCursor {
            pos: Point::new(Mm(x), Mm(y)),
        });
        self.ops.push(Op::SetFont {
            font: PdfFontHandle::Builtin(BuiltinFont::Courier),
            size: Pt(FONT_SIZE_PT),
        });
        self.ops.push(Op::SetFillColor { col: black() });
        self.ops.push(Op::ShowText {
            items: vec![TextItem::Text(text)],
        });
    }

    fn break_page(&mut self) {
        self.ops.push(Op::EndTextSection);
        let ops = std::mem::take(&mut self.ops);
        self.pages.push(PdfPage::new(Mm(PAGE_WIDTH_MM), Mm(PAGE_HEIGHT_MM), ops));
        self.page_number += 1;
        self.y_mm = PAGE_HEIGHT_MM - MARGIN_TOP_MM;
        self.ops.push(Op::StartTextSection);
        self.write_page_number();
    }

    fn ensure_space(&mut self, lines: f32) {
        if self.y_mm - lines * LINE_HEIGHT_MM < MARGIN_BOTTOM_MM {
            self.break_page();
        }
    }

    fn line(&mut self, text: &str, x_mm: f32, bold: bool) {
        if text.is_empty() {
            self.blank();
            return;
        }
        self.ensure_space(1.0);
        let font = if bold {
            BuiltinFont::CourierBold
        } else {
            BuiltinFont::Courier
        };
        self.ops.push(Op::SetTextCursor {
            pos: Point::new(Mm(x_mm), Mm(self.y_mm)),
        });
        self.ops.push(Op::SetFont {
            font: PdfFontHandle::Builtin(font),
            size: Pt(FONT_SIZE_PT),
        });
        self.ops.push(Op::SetFillColor { col: black() });
        self.ops.push(Op::ShowText {
            items: vec![TextItem::Text(text.to_string())],
        });
        self.y_mm -= LINE_HEIGHT_MM;
    }

    fn right_aligned_line(&mut self, text: &str, bold: bool) {
        let x = PAGE_WIDTH_MM - MARGIN_RIGHT_MM - (text.chars().count() as f32 * char_width_mm(FONT_SIZE_PT));
        self.line(text, x, bold);
    }

    fn blank(&mut self) {
        self.ensure_space(1.0);
        self.y_mm -= LINE_HEIGHT_MM;
    }

    fn finish(mut self) -> Vec<PdfPage> {
        self.ops.push(Op::EndTextSection);
        let ops = std::mem::take(&mut self.ops);
        self.pages.push(PdfPage::new(Mm(PAGE_WIDTH_MM), Mm(PAGE_HEIGHT_MM), ops));
        self.pages
    }
}

fn center_x(text: &str, font_size_pt: f32) -> f32 {
    let width = text.chars().count() as f32 * char_width_mm(font_size_pt);
    ((PAGE_WIDTH_MM - width) / 2.0).max(MARGIN_LEFT_MM / 2.0)
}

fn centered_text(ops: &mut Vec<Op>, text: &str, y_mm: f32, font_size_pt: f32, bold: bool) {
    let font = if bold {
        BuiltinFont::CourierBold
    } else {
        BuiltinFont::Courier
    };
    ops.push(Op::SetTextCursor {
        pos: Point::new(Mm(center_x(text, font_size_pt)), Mm(y_mm)),
    });
    ops.push(Op::SetFont {
        font: PdfFontHandle::Builtin(font),
        size: Pt(font_size_pt),
    });
    ops.push(Op::SetFillColor { col: black() });
    ops.push(Op::ShowText {
        items: vec![TextItem::Text(text.to_string())],
    });
}

fn build_title_page(document: &Document) -> PdfPage {
    let mut ops = vec![Op::StartTextSection];

    let title = if document.title.trim().is_empty() {
        "Untitled Screenplay".to_string()
    } else {
        document.title.to_uppercase()
    };
    let title_size = 18.0;
    let mut y = PAGE_HEIGHT_MM * 0.42;
    centered_text(&mut ops, &title, y, title_size, true);
    y -= title_size * MM_PER_PT * 1.8;

    if !document.subtitle.trim().is_empty() {
        centered_text(&mut ops, &document.subtitle, y, 12.0, false);
        y -= LINE_HEIGHT_MM * 1.6;
    }

    y -= 20.0;
    centered_text(&mut ops, "written by", y, 12.0, false);
    y -= LINE_HEIGHT_MM * 1.8;

    if !document.author.trim().is_empty() {
        centered_text(&mut ops, &document.author, y, 12.0, false);
    }

    if !document.draft.trim().is_empty() {
        centered_text(&mut ops, &document.draft, MARGIN_BOTTOM_MM + LINE_HEIGHT_MM, 10.5, false);
    }

    ops.push(Op::EndTextSection);
    PdfPage::new(Mm(PAGE_WIDTH_MM), Mm(PAGE_HEIGHT_MM), ops)
}

pub fn export(document: &Document, path: &Path) -> Result<(), String> {
    let mut pages = vec![build_title_page(document)];

    let mut pb = PageBuilder::new();
    for scene in &document.scenes {
        pb.line(&scene.heading.to_uppercase(), MARGIN_LEFT_MM, true);
        pb.blank();
        for el in &scene.elements {
            match el.element_type {
                ElementType::SceneHeading => {}
                ElementType::Action => {
                    for l in wrap(&el.text, ACTION_WIDTH_CH) {
                        pb.line(&l, MARGIN_LEFT_MM, false);
                    }
                    pb.blank();
                }
                ElementType::Character => {
                    pb.line(&el.text.to_uppercase(), MARGIN_LEFT_MM + CHARACTER_INDENT_MM, false);
                }
                ElementType::Parenthetical => {
                    for l in wrap(&el.text, PAREN_WIDTH_CH) {
                        pb.line(&l, MARGIN_LEFT_MM + PAREN_INDENT_MM, false);
                    }
                }
                ElementType::Dialogue => {
                    for l in wrap(&el.text, DIALOGUE_WIDTH_CH) {
                        pb.line(&l, MARGIN_LEFT_MM + DIALOGUE_INDENT_MM, false);
                    }
                    pb.blank();
                }
                ElementType::Transition => {
                    pb.right_aligned_line(&el.text.to_uppercase(), false);
                    pb.blank();
                }
                ElementType::Shot => {
                    for l in wrap(&el.text, ACTION_WIDTH_CH) {
                        pb.line(&l, MARGIN_LEFT_MM, true);
                    }
                    pb.blank();
                }
            }
        }
    }
    pages.extend(pb.finish());

    let mut doc = PdfDocument::new(&document.title);
    let bytes = doc.with_pages(pages).save(&PdfSaveOptions::default(), &mut Vec::new());
    std::fs::write(path, bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Document, ElementType, ScreenplayElement};

    #[test]
    fn exports_a_real_pdf_with_a_title_page_and_pagination() {
        let mut doc = Document::new("The Long Way Home");
        doc.subtitle = "A Screenplay".into();
        doc.author = "Sanjay Raajaa".into();
        doc.draft = "Draft 1 — September 2026".into();

        // Enough content that it must span multiple pages, to exercise
        // ensure_space()'s page-break path, not just a single page.
        doc.scenes.clear();
        for i in 0..40 {
            let mut scene = crate::model::Scene::new(format!("INT. WAREHOUSE {i} - DAY"));
            scene.elements = vec![
                ScreenplayElement::new(
                    ElementType::Action,
                    "Crates are stacked floor to ceiling. Dust hangs in a shaft of light. Somewhere, a pipe drips.",
                ),
                ScreenplayElement::new(ElementType::Character, "MAYA"),
                ScreenplayElement::new(
                    ElementType::Dialogue,
                    "We are not supposed to be here, and yet here we absolutely are, again.",
                ),
                ScreenplayElement::new(ElementType::Parenthetical, "(checking her watch)"),
                ScreenplayElement::new(ElementType::Dialogue, "Five minutes. That's all we get."),
                ScreenplayElement::new(ElementType::Transition, "CUT TO:"),
            ];
            doc.scenes.push(scene);
        }

        let dir = std::env::temp_dir();
        let path = dir.join("artscribe_pdf_export_test.pdf");
        export(&doc, &path).expect("export should succeed");

        let bytes = std::fs::read(&path).expect("output file should exist");
        assert!(bytes.starts_with(b"%PDF-"), "output should be a real PDF file");
        assert!(bytes.len() > 2000, "a 40-scene script should produce more than a trivial/empty PDF");

        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn wrap_respects_max_chars_and_preserves_words() {
        let lines = wrap("one two three four five six seven eight nine ten", 12);
        for line in &lines {
            assert!(line.chars().count() <= 12, "line exceeded max_chars: {line:?}");
        }
        assert_eq!(lines.join(" "), "one two three four five six seven eight nine ten");
    }
}
