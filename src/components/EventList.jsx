import { Pencil, Trash2, BellOff } from 'lucide-react';
import { formatDate, formatTime, formatDuration, getRelativeTime, isPast, getEventDateTime } from '../utils/dateUtils';

export default function EventList({ events, selectedMonth, onEdit, onDelete, activeAlarms, onStopAlarm }) {
  const filtered = events.filter(e => {
    const [y, m] = e.date.split('-').map(Number);
    return y === selectedMonth.year && m - 1 === selectedMonth.month;
  });

  const upcoming = filtered
    .filter(e => !isPast(e.date, e.time))
    .sort((a, b) => getEventDateTime(a) - getEventDateTime(b));

  const past = filtered
    .filter(e => isPast(e.date, e.time))
    .sort((a, b) => getEventDateTime(b) - getEventDateTime(a));

  const sorted = [...upcoming, ...past];

  if (sorted.length === 0) {
    return (
      <div className="event-list-card">
        <div className="event-list-empty">
          Aucun événement ce mois
        </div>
      </div>
    );
  }

  return (
    <div className="event-list-card">
      <div className="event-list-scroll">
        {sorted.map(event => {
          const eventPast = isPast(event.date, event.time);
          const hasAlarm = activeAlarms?.current?.has(event.id);
          return (
            <div key={event.id} className={`event-item${eventPast ? ' past' : ''}`}>
              <div className="event-info">
                <div className="event-title-row">
                  <span className={`event-title${eventPast ? ' struck' : ''}`}>
                    {event.title}
                  </span>
                  <span className="event-duration">{formatDuration(event.duration)}</span>
                </div>
                <div className="event-meta">
                  <span className="event-relative">{getRelativeTime(event.date, event.time)}</span>
                  <span className="event-date">
                    {formatDate(event.date)}
                    {event.time ? ` à ${formatTime(event.time)}` : ''}
                  </span>
                </div>
              </div>
              <div className="event-actions">
                {hasAlarm && (
                  <button className="event-btn alarm-btn" onClick={() => onStopAlarm(event.id)} title="Arrêter l'alarme">
                    <BellOff size={14} />
                  </button>
                )}
                <button className="event-btn edit-btn" onClick={() => onEdit(event)} title="Modifier">
                  <Pencil size={14} />
                </button>
                <button className="event-btn delete-btn" onClick={() => onDelete(event)} title="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
