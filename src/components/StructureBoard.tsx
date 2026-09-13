import { useState } from "react";
import type { DragEvent } from "react";
import { useStore } from "../store";
import type { Scene } from "../types";
import { sceneWordCount } from "../lib/model";

/** v1 simplification: the structure board reorders the actual screenplay
 * sequence (dragging a card moves the scene) rather than keeping a fully
 * independent board layout — see docs/features.md F-DOC-2. Cards are
 * grouped into act columns; dragging between columns re-assigns the act. */
export default function StructureBoard() {
  const document = useStore((s) => s.document);
  const commitDocument = useStore((s) => s.commitDocument);
  const [dragId, setDragId] = useState<string | null>(null);

  if (!document) return null;

  const unassigned = document.scenes.filter((s) => !s.act_id || !document.acts.some((a) => a.id === s.act_id));

  function moveScene(sceneId: string, targetActId: string | null, beforeSceneId: string | null) {
    commitDocument((doc) => {
      const scene = doc.scenes.find((s) => s.id === sceneId);
      if (!scene) return doc;
      const withoutMoved = doc.scenes.filter((s) => s.id !== sceneId);
      const updatedScene = { ...scene, act_id: targetActId };
      const insertAt = beforeSceneId
        ? withoutMoved.findIndex((s) => s.id === beforeSceneId)
        : withoutMoved.length;
      const scenes = [...withoutMoved];
      scenes.splice(insertAt === -1 ? scenes.length : insertAt, 0, updatedScene);
      return { ...doc, scenes };
    });
  }

  function handleDrop(e: DragEvent, targetActId: string | null, beforeSceneId: string | null) {
    e.preventDefault();
    const sceneId = e.dataTransfer.getData("text/plain");
    if (sceneId) moveScene(sceneId, targetActId, beforeSceneId);
    setDragId(null);
  }

  function Card({ scene }: { scene: Scene }) {
    return (
      <div
        className="structure-card"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", scene.id);
          setDragId(scene.id);
        }}
        onDragEnd={() => setDragId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.stopPropagation();
          handleDrop(e, scene.act_id, scene.id);
        }}
        style={{ borderTopColor: scene.color ?? "var(--line-strong)" }}
      >
        <div className="structure-card-heading">{scene.heading || "(untitled scene)"}</div>
        <div className="structure-card-synopsis">{scene.synopsis || <em>No synopsis</em>}</div>
        <div className="structure-card-meta">{sceneWordCount(scene)} words</div>
      </div>
    );
  }

  function Column({ actId, title, color }: { actId: string | null; title: string; color?: string | null }) {
    const scenes = document!.scenes.filter((s) => (actId === null ? unassigned.includes(s) : s.act_id === actId));
    return (
      <div
        className="structure-column"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, actId, null)}
      >
        <div className="structure-column-header" style={{ borderBottomColor: color ?? "var(--line-strong)" }}>
          {title}
          <span className="structure-column-count">{scenes.length}</span>
        </div>
        <div className="structure-column-body">
          {scenes.map((scene) => (
            <Card key={scene.id} scene={scene} />
          ))}
          {scenes.length === 0 && <div className="structure-empty">Drop scenes here</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`structure-view ${dragId ? "dragging" : ""}`}>
      {document.acts.map((act) => (
        <Column key={act.id} actId={act.id} title={act.name} color={act.color} />
      ))}
      <Column actId={null} title="Unassigned" />
    </div>
  );
}
