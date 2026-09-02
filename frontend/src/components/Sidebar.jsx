import { ChatIcon, UploadIcon, SearchIcon } from "./icons";
import "./Sidebar.css";

const NAV_ITEMS = [
  { id: "chat", label: "Chat", Icon: ChatIcon },
  { id: "upload", label: "Upload", Icon: UploadIcon },
  { id: "search", label: "Search", Icon: SearchIcon },
];

export default function Sidebar({ view, onNavigate, open, status }) {
  return (
    <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
      <div className="sidebar__header">
        <span className="sidebar__mark" aria-hidden="true">
          <span className="sidebar__mark-glyph">&gt;_</span>
        </span>
        <h1 className="sidebar__title">
          recipe<span className="sidebar__title-accent">.ai</span>
        </h1>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-btn${view === id ? " nav-btn--active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="status">
          <span className={`status__dot${status.online ? " status__dot--online" : ""}`} />
          <span className="status__text">{status.text}</span>
        </div>
      </div>
    </aside>
  );
}
