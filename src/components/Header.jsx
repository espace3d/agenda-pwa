import { Sun, Moon, List, CalendarDays } from 'lucide-react';

export default function Header({ theme, onToggleTheme, viewMode, onToggleView }) {
  return (
    <div className="header">
      <button className="theme-toggle" onClick={onToggleTheme} aria-label="Changer de thème">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="title-badge">Agenda</div>
      <button className="view-toggle" onClick={onToggleView} aria-label="Changer de vue">
        {viewMode === 'list' ? <CalendarDays size={18} /> : <List size={18} />}
      </button>
    </div>
  );
}
