const EVENTS_KEY = 'agenda_events';
const THEME_KEY = 'agenda_theme';
const NOTIFIED_KEY = 'agenda_notified';

export function loadEvents() {
  try {
    const data = localStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function getNotifiedSet() {
  try {
    const data = localStorage.getItem(NOTIFIED_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

export function addNotified(eventId) {
  const set = getNotifiedSet();
  set.add(eventId);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
}

export function removeNotified(eventId) {
  const set = getNotifiedSet();
  set.delete(eventId);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
}
