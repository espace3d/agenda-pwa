import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MonthSelector from './components/MonthSelector';
import EventList from './components/EventList';
import CalendarView from './components/CalendarView';
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
  const [viewMode, setViewMode] = useState('list');
  const [voicePrefill, setVoicePrefill] = useState(null);

  const { stopAlarm, activeAlarms } = useNotifications(events);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  useEffect(() => {
    saveTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.setAttribute('content', theme === 'dark' ? '#131316' : '#f5f5f7');
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaStatusBar) metaStatusBar.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const toggleView = () => setViewMode(v => v === 'list' ? 'calendar' : 'list');

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
      setVoicePrefill({
        title: parsed.title,
        date: parsed.date || null,
        time: parsed.time || null
      });
      setEditingEvent(null);
      setFormOpen(true);
    }
  }, []);

  const { dictating, dictLiveText, toggleDictation } = useSpeechRecognition(handleVoiceResult);

  return (
    <div className="app-container">
      <Header theme={theme} onToggleTheme={toggleTheme} viewMode={viewMode} onToggleView={toggleView} />
      <MonthSelector selectedMonth={selectedMonth} onSelectMonth={setSelectedMonth} />

      {viewMode === 'list' ? (
        <EventList
          events={events}
          selectedMonth={selectedMonth}
          onEdit={handleEdit}
          onDelete={setDeleteEvent}
          activeAlarms={activeAlarms}
          onStopAlarm={stopAlarm}
        />
      ) : (
        <CalendarView
          events={events}
          selectedMonth={selectedMonth}
          onEdit={handleEdit}
          onDelete={setDeleteEvent}
        />
      )}

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
          onClose={() => { setFormOpen(false); setEditingEvent(null); setVoicePrefill(null); }}
          events={events}
          voicePrefill={voicePrefill}
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
