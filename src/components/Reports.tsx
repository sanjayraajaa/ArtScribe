import { useEffect, useState } from "react";
import { useStore } from "../store";
import { api } from "../api";
import type { CharacterReport, LocationReport, StatisticsReport } from "../types";

type ReportKind = "statistics" | "character" | "location";

export default function Reports() {
  const document = useStore((s) => s.document);
  const [kind, setKind] = useState<ReportKind>("statistics");
  const [characterId, setCharacterId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [stats, setStats] = useState<StatisticsReport | null>(null);
  const [charReport, setCharReport] = useState<CharacterReport | null>(null);
  const [locReport, setLocReport] = useState<LocationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;
    if (kind === "statistics") {
      api.getStatisticsReport(document).then(setStats).catch((e) => setError(String(e)));
    }
  }, [document, kind]);

  useEffect(() => {
    if (!document || !characterId) return;
    api
      .getCharacterReport(document, characterId)
      .then(setCharReport)
      .catch((e) => setError(String(e)));
  }, [document, characterId]);

  useEffect(() => {
    if (!document || !locationId) return;
    api
      .getLocationReport(document, locationId)
      .then(setLocReport)
      .catch((e) => setError(String(e)));
  }, [document, locationId]);

  if (!document) return null;

  return (
    <div className="reports-view">
      <div className="reports-tabs">
        <button className={kind === "statistics" ? "active" : ""} onClick={() => setKind("statistics")}>
          Statistics
        </button>
        <button className={kind === "character" ? "active" : ""} onClick={() => setKind("character")}>
          Character
        </button>
        <button className={kind === "location" ? "active" : ""} onClick={() => setKind("location")}>
          Location
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {kind === "statistics" && stats && (
        <div className="report-body">
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-value">{stats.scene_count}</div>
              <div className="stat-label">Scenes</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{stats.total_words.toLocaleString()}</div>
              <div className="stat-label">Words</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">~{Math.round(stats.page_estimate)}</div>
              <div className="stat-label">Pages (estimate)</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{stats.dialogue_to_action_ratio.toFixed(2)}</div>
              <div className="stat-label">Dialogue : Action</div>
            </div>
          </div>
          <h4>Screen time by character</h4>
          <table className="report-table">
            <thead>
              <tr>
                <th>Character</th>
                <th>Scenes</th>
                <th>Dialogue words</th>
              </tr>
            </thead>
            <tbody>
              {stats.character_screen_time.map((c) => (
                <tr key={c.character_name}>
                  <td>{c.character_name}</td>
                  <td>{c.scene_count}</td>
                  <td>{c.dialogue_words}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kind === "character" && (
        <div className="report-body">
          <select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
            <option value="">Select a character...</option>
            {document.characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {charReport && (
            <>
              <p>
                <strong>{charReport.character_name}</strong> — {charReport.total_lines} dialogue lines across{" "}
                {charReport.rows.length} scenes
              </p>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Scene</th>
                    <th>Lines</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {charReport.rows.map((row) => (
                    <tr key={row.scene_id}>
                      <td>{row.scene_heading}</td>
                      <td>{row.line_count}</td>
                      <td>{row.notes.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {kind === "location" && (
        <div className="report-body">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Select a location...</option>
            {document.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {locReport && (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Scene</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {locReport.rows.map((row) => (
                  <tr key={row.scene_id}>
                    <td>{row.scene_heading}</td>
                    <td>{row.notes.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
