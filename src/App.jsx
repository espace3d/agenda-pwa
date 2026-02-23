import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MonthSelector from './components/MonthSelector';
import EventList from './components/EventList';
import EventForm from './components/EventForm';
import ActionBar from './components/ActionBar';
import ConfirmModal from './components/ConfirmModal';
import Toast from './components/Toast';
import { loadEvents, saveEvents, loadTheme, saveTheme, removeNotified } from './utils/storage';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useNotifications, requestNotificationPermission } from './hooks/useNotifications';
import { parseVoiceInput, formatShareText, isPast, getEventDateTime } from './utils/dateUtils';
import './App.css';

export default function App() {
  const [events, setEvents] = useState(() => loadEvents());
  const [theme, setTheme] = useState(() => loadTheme());
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [toast, setToast] = useState('');

  const { stopAlarm, activeAlarms } = useNotifications(events);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  useEffect(() => {
    saveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    const handler = () => {
      requestNotificationPermission();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSaveEvent = (eventData) => {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === eventData.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = eventData;
        return updated;
      }
      return [...prev, eventData];
    });
    removeNotified(eventData.id);
    setFormOpen(false);
    setEditingEvent(null);
    setToast(editingEvent ? 'Événement modifié' : 'Événement créé');
  };

  const handleDeleteConfirm = () => {
    if (deleteEvent) {
      setEvents(prev => prev.filter(e => e.id !== deleteEvent.id));
      removeNotified(deleteEvent.id);
      stopAlarm(deleteEvent.id);
      setDeleteEvent(null);
      setToast('Événement supprimé');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setFormOpen(true);
  };

  const handleShare = async () => {
    const monthEvents = events
      .filter(e => {
        const [y, m] = e.date.split('-').map(Number);
        return y === selectedMonth.year && m - 1 === selectedMonth.month;
      })
      .filter(e => !isPast(e.date, e.time))
      .sort((a, b) => getEventDateTime(a) - getEventDateTime(b));

    if (monthEvents.length === 0) {
      setToast('Aucun événement à partager');
      return;
    }

    const text = monthEvents.map(formatShareText).join('\n\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: '⏳ Agenda', text });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setToast('Copié dans le presse-papier');
      } catch {}
    }
  };

  const handleVoiceResult = useCallback((transcript) => {
    const parsed = parseVoiceInput(transcript);
    if (parsed.title) {
      const newEvent = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        title: parsed.title,
        date: parsed.date || `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
        time: parsed.time || '12:00',
        duration: '30min'
      };

      const isDuplicate = events.some(ev =>
        ev.title.toLowerCase() === newEvent.title.toLowerCase()
        && ev.date === newEvent.date
        && ev.time === newEvent.time
      );

      if (isDuplicate) {
        setToast('Un événement identique existe déjà à cette date et heure.');
        return;
      }

      setEvents(prev => [...prev, newEvent]);
      setToast(`"${parsed.title}" ajouté`);
    }
  }, [events, selectedMonth]);

  const { dictating, dictLiveText, toggleDictation } = useSpeechRecognition(handleVoiceResult);

  return (
    <div className="app-container">
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <MonthSelector selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />
      <EventList
        events={events}
        selectedMonth={selectedMonth}
        onEdit={handleEdit}
        onDelete={setDeleteEvent}
        activeAlarms={activeAlarms}
        onStopAlarm={stopAlarm}
      />

      {dictating && dictLiveText && (
        <div className="dict-live-bar">{dictLiveText}</div>
      )}

      <ActionBar
        onAdd={handleAdd}
        onShare={handleShare}
        onToggleDictation={toggleDictation}
        dictating={dictating}
      />

      {formOpen && (
        <EventForm
          event={editingEvent}
          selectedMonth={selectedMonth}
          onSave={handleSaveEvent}
          onClose={() => { setFormOpen(false); setEditingEvent(null); }}
          events={events}
        />
      )}

      {deleteEvent && (
        <ConfirmModal
          message={`Supprimer "${deleteEvent.title}" ?`}
          hint="Cette action est irréversible."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteEvent(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
