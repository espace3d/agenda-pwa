import { Redis } from '@upstash/redis';
import webpush from 'web-push';

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const STAGES = [
  { offset: 30 * 60 * 1000, key: '30', label: 'dans 30 minutes' },
  { offset: 10 * 60 * 1000, key: '10', label: 'dans 10 minutes' },
  { offset: 0, key: '0', label: "c'est l'heure !" },
];

const WINDOW_MS = 2 * 60 * 1000; // 2 minutes window
const DEDUP_TTL = 3600; // 1 hour

function getEventTime(event, timezone) {
  if (!event.time) return null;
  const [y, m, d] = event.date.split('-').map(Number);
  const [h, min] = event.time.split(':').map(Number);

  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    const utcDate = new Date(`${dateStr}Z`);
    const parts = formatter.formatToParts(utcDate);
    const get = (type) => parseInt(parts.find(p => p.type === type).value);

    const tzYear = get('year');
    const tzMonth = get('month');
    const tzDay = get('day');
    const tzHour = get('hour') === 24 ? 0 : get('hour');
    const tzMin = get('minute');

    const localTarget = new Date(y, m - 1, d, h, min, 0, 0);
    const utcFormatted = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0, 0);
    const offsetMs = utcFormatted.getTime() - utcDate.getTime();

    return localTarget.getTime() - offsetMs;
  } catch {
    return new Date(y, m - 1, d, h, min, 0, 0).getTime();
  }
}

export default async function handler(req, res) {
  const token = req.query.token || req.headers['x-cron-token'];
  if (token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const redis = getRedis();
  const now = Date.now();
  let sent = 0;
  let errors = 0;
  let cleaned = 0;

  try {
    let cursor = 0;
    const keys = [];
    do {
      const result = await redis.scan(cursor, { match: 'sub:*', count: 100 });
      cursor = Number(result[0]);
      keys.push(...result[1]);
    } while (cursor !== 0);

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;

      let data;
      try {
        data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        continue;
      }

      const { subscription, events, timezone } = data;
      if (!subscription || !events) continue;

      const hash = key.replace('sub:', '');

      for (const event of events) {
        if (event.duration === 'day' && !event.time) continue;

        const eventTime = getEventTime(event, timezone || 'Europe/Paris');
        if (!eventTime) continue;

        for (const stage of STAGES) {
          const triggerAt = eventTime - stage.offset;
          const diff = now - triggerAt;

          if (diff >= 0 && diff < WINDOW_MS) {
            const dedupKey = `notified:${hash}:${event.id}-${stage.key}`;

            const already = await redis.get(dedupKey);
            if (already) continue;

            await redis.set(dedupKey, '1', { ex: DEDUP_TTL });

            const timeStr = event.time ? ` à ${event.time.replace(':', 'h')}` : '';
            const [y, m, d] = event.date.split('-');
            const dateStr = `${d}/${m}/${y}`;

            const payload = JSON.stringify({
              title: `⏳ ${event.title}`,
              body: `${dateStr}${timeStr} — ${stage.label}`,
              eventId: event.id,
              stageKey: stage.key,
            });

            try {
              await webpush.sendNotification(subscription, payload);
              sent++;
            } catch (err) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await redis.del(key);
                cleaned++;
                break;
              }
              errors++;
              console.error(`Push failed for ${hash}:`, err.statusCode || err.message);
            }
          }
        }
      }
    }

    return res.status(200).json({ ok: true, sent, errors, cleaned, checked: keys.length });
  } catch (err) {
    console.error('cron error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
