import { useStore } from "../store";
import type { ViewName } from "../store";
import { IconBarChart, IconBook, IconEdit, IconGrid, IconTrendingUp } from "./icons";

const ITEMS: { id: ViewName; label: string; icon: typeof IconEdit }[] = [
  { id: "editor", label: "Editor", icon: IconEdit },
  { id: "structure", label: "Structure", icon: IconGrid },
  { id: "timeline", label: "Timeline", icon: IconBarChart },
  { id: "notebook", label: "Notebook", icon: IconBook },
  { id: "reports", label: "Reports", icon: IconTrendingUp },
];

export default function Sidebar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);

  return (
    <nav className="sidebar">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`sidebar-item ${view === item.id ? "active" : ""}`}
            onClick={() => setView(item.id)}
          >
            <span className="sidebar-icon">
              <Icon size={20} />
            </span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
