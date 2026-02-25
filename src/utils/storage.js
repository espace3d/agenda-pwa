const EVENTS_KEY = 'agenda_events';
const THEME_KEY = 'agenda_theme';
const NOTIFIED_KEY = 'agenda_notified';
const COLORS_KEY = 'agenda_custom_colors';

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
  for (const key of set) {
    if (key === eventId || key.startsWith(eventId + '-')) {
      set.delete(key);
    }
  }
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
}

const DEFAULT_COLORS = { accentColor: '#d946ef', darkColor: '#1a1a1a' };

export function loadCustomColors() {
  try {
    const data = localStorage.getItem(COLORS_KEY);
    return data ? { ...DEFAULT_COLORS, ...JSON.parse(data) } : { ...DEFAULT_COLORS };
  } catch {
    return { ...DEFAULT_COLORS };
  }
}

export function saveCustomColors(colors) {
  localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
}
