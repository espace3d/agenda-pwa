import { Sun, Moon } from 'lucide-react';

export default function Header({ theme, onToggleTheme }) {
  return (
    <div className="header">
      <button className="theme-toggle" onClick={onToggleTheme} aria-label="Changer de thème">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="title-badge">Agenda</div>
    </div>
  );
}
