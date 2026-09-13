import { useStore } from "../store";
import { sceneWordCount } from "../lib/model";

export default function Timeline() {
  const document = useStore((s) => s.document);
  const setView = useStore((s) => s.setView);

  if (!document) return null;

  const actById = new Map(document.acts.map((a) => [a.id, a]));

  function jumpToScene(sceneId: string) {
    setView("editor");
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.document.getElementById(`scene-${sceneId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    });
  }

  return (
    <div className="timeline-view">
      <div className="timeline-track">
        {document.scenes.map((scene) => {
          const act = scene.act_id ? actById.get(scene.act_id) : undefined;
          const words = Math.max(sceneWordCount(scene), 10);
          const color = scene.color ?? act?.color ?? "var(--line-strong)";
          return (
            <button
              key={scene.id}
              className="timeline-block"
              style={{ flexGrow: words, background: color }}
              title={`${scene.heading}\n${scene.synopsis}`}
              onClick={() => jumpToScene(scene.id)}
            >
              <span className="timeline-block-label">{scene.heading}</span>
            </button>
          );
        })}
      </div>
      <div className="timeline-legend">
        {document.acts.map((act) => (
          <span key={act.id} className="legend-item">
            <span className="legend-swatch" style={{ background: act.color ?? "var(--line-strong)" }} />
            {act.name}
          </span>
        ))}
      </div>
    </div>
  );
}
