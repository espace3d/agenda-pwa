const MONTH_NAMES = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

const MONTH_NAMES_FULL = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

export function getMonthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${String(year).slice(2)}`;
}

export function getMonthsList() {
  const now = new Date();
  const months = [];
  for (let i = -6; i <= 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
}

export function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `le ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  return timeStr.replace(':', 'h');
}

export function formatDuration(duration) {
  const map = {
    '30min': '30 min',
    '1h': '1h',
    '2h': '2h',
    '3h': '3h',
    '4h': '4h',
    'day': 'Journée'
  };
  return map[duration] || duration;
}

export function getRelativeTime(dateStr, timeStr) {
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const eventDate = new Date(y, m - 1, d);

  if (timeStr) {
    const [h, min] = timeStr.split(':').map(Number);
    eventDate.setHours(h, min, 0, 0);
  }

  const diffMs = eventDate.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    const absMonths = Math.abs(diffMonths);
    if (absDays === 0) return "aujourd'hui";
    if (absDays === 1) return 'hier';
    if (absMonths >= 1) return `il y a ${absMonths} mois`;
    return `il y a ${absDays} jour${absDays > 1 ? 's' : ''}`;
  }

  if (diffMin < 60) return `dans ${Math.max(1, diffMin)} min`;
  if (diffH < 24) return `dans ${diffH}h`;
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'demain';
  if (diffMonths >= 1) return `dans ${diffMonths} mois`;
  return `dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
}

export function isPast(dateStr, timeStr) {
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const eventDate = new Date(y, m - 1, d);
  if (timeStr) {
    const [h, min] = timeStr.split(':').map(Number);
    eventDate.setHours(h, min, 0, 0);
  } else {
    eventDate.setHours(23, 59, 59, 999);
  }
  return eventDate.getTime() < now.getTime();
}

export function getEventDateTime(event) {
  const [y, m, d] = event.date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (event.time) {
    const [h, min] = event.time.split(':').map(Number);
    date.setHours(h, min, 0, 0);
  }
  return date;
}

export function parseVoiceInput(text) {
  const result = { title: text, date: null, time: null };

  const datePatterns = [
    /le\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i,
    /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i,
  ];

  const monthMap = {
    'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3,
    'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7, 'aout': 7,
    'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11
  };

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const month = monthMap[match[2].toLowerCase()];
      if (month !== undefined) {
        const year = new Date().getFullYear();
        const dateObj = new Date(year, month, day);
        if (dateObj.getTime() < Date.now()) {
          dateObj.setFullYear(year + 1);
        }
        result.date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        result.title = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
      }
      break;
    }
  }

  const timePatterns = [
    /[àa]\s*(\d{1,2})\s*[hH]\s*(\d{0,2})/,
    /(\d{1,2})\s*[hH]\s*(\d{0,2})/,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      const h = parseInt(match[1]);
      const m = match[2] ? parseInt(match[2]) : 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        result.time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        result.title = result.title.replace(match[0], '').replace(/\s+/g, ' ').trim();
      }
      break;
    }
  }

  result.title = result.title
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (result.title) {
    result.title = result.title.charAt(0).toUpperCase() + result.title.slice(1);
  }

  return result;
}

export function formatShareText(event) {
  const date = formatDate(event.date);
  const time = event.time ? ` à ${formatTime(event.time)}` : '';
  const dur = ` (${formatDuration(event.duration)})`;
  return `⏳ ${event.title}\n📅 ${date}${time}${dur}`;
}
