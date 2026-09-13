import { useStore } from "../store";

export default function DialogHost() {
  const dialog = useStore((s) => s.dialog);
  const resolveDialog = useStore((s) => s.resolveDialog);

  if (!dialog) return null;

  return (
    <div className="dialog-overlay" onClick={() => resolveDialog(false)}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-message">{dialog.message}</p>
        <div className="dialog-actions">
          {dialog.kind === "confirm" && (
            <button className="dialog-button" onClick={() => resolveDialog(false)}>
              Cancel
            </button>
          )}
          <button
            className={`dialog-button primary ${dialog.danger ? "danger" : ""}`}
            onClick={() => resolveDialog(true)}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
