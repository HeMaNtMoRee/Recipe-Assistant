import { MenuIcon } from "./icons";
import "./ViewHeader.css";

export default function ViewHeader({ title, subtitle, onToggleSidebar }) {
  return (
    <header className="view-header">
      <button
        type="button"
        className="view-header__menu"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <MenuIcon width={18} height={18} />
      </button>
      <div>
        <h2 className="view-header__title">{title}</h2>
        <p className="view-header__subtitle">{subtitle}</p>
      </div>
    </header>
  );
}
