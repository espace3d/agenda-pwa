import { Share2, Plus, Mic } from 'lucide-react';

export default function ActionBar({ onAdd, onShare, onToggleDictation, dictating }) {
  return (
    <div className="action-bar">
      <button className="round-btn" onClick={onShare} title="Partager">
        <Share2 size={20} />
      </button>
      <button className="round-btn" onClick={onAdd} title="Ajouter">
        <Plus size={20} />
      </button>
      <button
        className={`round-btn${dictating ? ' round-btn-recording' : ''}`}
        onClick={onToggleDictation}
        title="Dictée vocale"
      >
        <Mic size={20} className={dictating ? 'pulse' : ''} />
      </button>
    </div>
  );
}
