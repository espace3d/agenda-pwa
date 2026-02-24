import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { formatTime, formatDuration, isPast, getEventDateTime } from '../utils/dateUtils';

const DAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function getDurationHours(duration) {
  const map = { '30min': 0.5, '1h': 1, '2h': 2, '3h': 3, '4h': 4, 'day': 8 };
  return map[duration] || 0;
}

export default function CalendarView({ events, selectedMonth, onEdit, onDelete }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const grid = useMemo(() => {
    const first = new Date(selectedMonth.year, selectedMonth.month, 1);
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
    const daysInPrev = new Date(selectedMonth.year, selectedMonth.month, 0).getDate();

    const cells = [];
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, inMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, inMonth: true });
    }
    while (cells.length < 42) {
      cells.push({ day: cells.length - (startDay + daysInMonth) + 1, inMonth: false });
    }
    while (cells.length > 35 && cells.slice(-7).every(c => !c.inMonth)) {
      cells.splice(-7);
    }
    return cells;
  }, [selectedMonth]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(event => {
      const [y, m, d] = event.date.split('-').map(Number);
      if (y === selectedMonth.year && m - 1 === selectedMonth.month) {
        if (!map[d]) map[d] = [];
        map[d].push(event);
      }
    });
    Object.values(map).forEach(dayEvents => {
      dayEvents.sort((a, b) => getEventDateTime(a) - getEventDateTime(b));
    });
    return map;
  }, [events, selectedMonth]);

  const today = new Date();
  const isToday = (day) =>
    day === today.getDate() && selectedMonth.month === today.getMonth() && selectedMonth.year === today.getFullYear();

  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  return (
    <div className="calendar-view">
      <div className="calendar-grid-container">
        <div className="calendar-day-header">
          {DAYS.map(d => <div key={d} className="calendar-day-name">{d}</div>)}
        </div>
        <div className="calendar-grid">
          {grid.map((cell, i) => {
            const dayEvents = cell.inMonth ? (eventsByDay[cell.day] || []) : [];
            const totalHours = dayEvents.reduce((sum, e) => sum + getDurationHours(e.duration), 0);
            const isSelected = selectedDay === cell.day && cell.inMonth;

            return (
              <div
                key={i}
                className={`calendar-cell${!cell.inMonth ? ' out' : ''}${isToday(cell.day) && cell.inMonth ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                onClick={() => cell.inMonth && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
              >
                <span className={`calendar-cell-day${isToday(cell.day) && cell.inMonth ? ' today-badge' : ''}`}>
                  {cell.day}
                </span>
                {cell.inMonth && dayEvents.length > 0 && (
                  <div className="calendar-cell-events">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className={`calendar-event-dot${isPast(ev.date, ev.time) ? ' past' : ''}`} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="calendar-event-more">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                )}
                {cell.inMonth && totalHours > 0 && (
                  <span className="calendar-cell-hours">{totalHours}h</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && selectedDayEvents.length > 0 && (
        <div className="calendar-day-detail">
          <div className="calendar-day-detail-header">
            {selectedDay} {MONTHS[selectedMonth.month]}
          </div>
          <div className="calendar-day-detail-events">
            {selectedDayEvents.map(event => (
              <div key={event.id} className={`calendar-detail-event${isPast(event.date, event.time) ? ' past' : ''}`}>
                <div className="calendar-detail-event-time">
                  {event.time ? formatTime(event.time) : 'Journée'}
                </div>
                <div className="calendar-detail-event-info">
                  <span className="calendar-detail-event-title">{event.title}</span>
                  <span className="calendar-detail-event-duration">{formatDuration(event.duration)}</span>
                </div>
                <div className="calendar-detail-actions">
                  <button className="event-btn edit-btn" onClick={() => onEdit(event)} title="Modifier">
                    <Pencil size={14} />
                  </button>
                  <button className="event-btn delete-btn" onClick={() => onDelete(event)} title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && selectedDayEvents.length === 0 && (
        <div className="calendar-day-detail">
          <div className="calendar-day-detail-header">
            {selectedDay} {MONTHS[selectedMonth.month]}
          </div>
          <div className="calendar-day-detail-empty">Aucun événement</div>
        </div>
      )}
    </div>
  );
}
