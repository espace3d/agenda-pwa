import { useState, useEffect } from 'react';
import { X, Mic } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseVoiceInput } from '../utils/dateUtils';
import TimePicker from './TimePicker';
import DatePicker from './DatePicker';

const DURATIONS = [
  { value: '30min', label: '30 min' },
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '3h', label: '3h' },
  { value: '4h', label: '4h' },
  { value: 'day', label: 'Journée' },
];

export default function EventForm({ event, selectedMonth, onSave, onClose, events }) {
  const isEdit = !!event;
  const defaultDate = () => {
    const y = selectedMonth.year;
    const m = String(selectedMonth.month + 1).padStart(2, '0');
    const d = String(new Date().getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate] = useState(event?.date || defaultDate());
  const [time, setTime] = useState(event?.time || '12:00');
  const [duration, setDuration] = useState(event?.duration || '30min');
  const [error, setError] = useState('');

  const handleVoiceResult = (transcript) => {
    const parsed = parseVoiceInput(transcript);
    if (parsed.title) setTitle(prev => prev ? `${prev} ${parsed.title}` : parsed.title);
    if (parsed.date) setDate(parsed.date);
    if (parsed.time) setTime(parsed.time);
  };

  const { dictating, dictLiveText, toggleDictation, supported } = useSpeechRecognition(handleVoiceResult);

  useEffect(() => {
    return () => { };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Le titre est requis.');
      return;
    }

    const isDuplicate = events.some(ev => {
      if (isEdit && ev.id === event.id) return false;
      return ev.title.toLowerCase() === title.trim().toLowerCase()
        && ev.date === date
        && ev.time === time;
    });

    if (isDuplicate) {
      setError('Un événement identique existe déjà à cette date et heure.');
      return;
    }

    onSave({
      id: event?.id || Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: title.trim(),
      date,
      time: duration === 'day' ? '' : time,
      duration
    });
  };

  return (
    <div className="modal-overlay modal-top" onClick={onClose}>
      <div className="modal-content event-form" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h3>{isEdit ? 'Modifier' : 'Nouvel événement'}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Titre</label>
            <div className="title-input-row">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titre de l'événement"
              />
              {supported && (
                <button
                  type="button"
                  className={`mic-btn${dictating ? ' recording' : ''}`}
                  onClick={toggleDictation}
                >
                  <Mic size={18} className={dictating ? 'pulse' : ''} />
                </button>
              )}
            </div>
            {dictating && dictLiveText && (
              <div className="dict-live-bar">{dictLiveText}</div>
            )}
          </div>

          <div className="form-field">
            <label>Date</label>
            <DatePicker value={date} onChange={setDate} />
          </div>

          {duration !== 'day' && (
            <div className="form-field">
              <label>Heure</label>
              <TimePicker value={time} onChange={setTime} />
            </div>
          )}

          <div className="form-field">
            <label>Durée</label>
            <div className="duration-chips">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  className={`duration-chip${duration === d.value ? ' active' : ''}`}
                  onClick={() => setDuration(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="submit-btn">
            {isEdit ? 'Modifier' : 'Créer'}
          </button>
        </form>
      </div>
    </div>
  );
}
