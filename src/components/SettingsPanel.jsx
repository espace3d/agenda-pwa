import { X, RotateCcw } from 'lucide-react';

const DEFAULTS = { accentColor: '#d946ef', darkColor: '#1a1a1a' };

export default function SettingsPanel({ colors, onChange, onClose }) {
  const handleReset = () => onChange({ ...DEFAULTS });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h3>Couleurs (thème clair)</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="settings-row">
          <label>Couleur d'accent</label>
          <input
            type="color"
            value={colors.accentColor}
            onChange={e => onChange({ ...colors, accentColor: e.target.value })}
          />
        </div>

        <div className="settings-row">
          <label>Couleur sombre</label>
          <input
            type="color"
            value={colors.darkColor}
            onChange={e => onChange({ ...colors, darkColor: e.target.value })}
          />
        </div>

        <button className="settings-reset" onClick={handleReset}>
          <RotateCcw size={14} />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
