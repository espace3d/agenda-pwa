export default function ConfirmModal({ message, hint, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-popup" onClick={e => e.stopPropagation()}>
        <p className="confirm-text">{message}</p>
        {hint && <p className="confirm-hint">{hint}</p>}
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>Annuler</button>
          <button className="confirm-delete" onClick={onConfirm}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}
