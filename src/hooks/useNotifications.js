import { useEffect, useRef, useCallback } from 'react';
import { getEventDateTime } from '../utils/dateUtils';
import { getNotifiedSet, addNotified } from '../utils/storage';

const NOTIFY_BEFORE_MS = 30 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 5;
const CHECK_INTERVAL_MS = 30 * 1000;

function playBeeps() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      const start = ctx.currentTime + i * 0.4;
      osc.start(start);
      osc.stop(start + 0.15);
    }
  } catch {}
}

function vibrate() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200, 100, 200, 100, 200]);
    }
  } catch {}
}

async function showNotification(event) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker?.ready;
    const timeStr = event.time ? ` à ${event.time.replace(':', 'h')}` : '';
    const [y, m, d] = event.date.split('-');
    const dateStr = `${d}/${m}/${y}`;
    if (reg) {
      reg.showNotification(`⏳ ${event.title}`, {
        body: `${dateStr}${timeStr}`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `event-${event.id}`,
        requireInteraction: true,
        actions: [{ action: 'stop', title: 'Arrêter' }]
      });
    } else {
      new Notification(`⏳ ${event.title}`, {
        body: `${dateStr}${timeStr}`,
        icon: '/icons/icon-192.png',
        tag: `event-${event.id}`
      });
    }
  }
}

export function useNotifications(events) {
  const activeAlarmsRef = useRef(new Map());
  const checkIntervalRef = useRef(null);

  const triggerAlarm = useCallback((event) => {
    const existing = activeAlarmsRef.current.get(event.id);
    if (existing) return;

    let retryCount = 0;
    let retryTimer = null;

    const runSequence = () => {
      playBeeps();
      vibrate();
      showNotification(event);
    };

    const startRetries = () => {
      if (retryCount >= MAX_RETRIES) {
        stopAlarm(event.id);
        return;
      }
      retryTimer = setTimeout(() => {
        retryCount++;
        runSequence();
        startRetries();
      }, RETRY_INTERVAL_MS);
    };

    const stopAlarm = (id) => {
      clearTimeout(retryTimer);
      activeAlarmsRef.current.delete(id);
    };

    activeAlarmsRef.current.set(event.id, { stop: () => stopAlarm(event.id) });
    addNotified(event.id);
    runSequence();
    startRetries();
  }, []);

  const stopAlarm = useCallback((eventId) => {
    const alarm = activeAlarmsRef.current.get(eventId);
    if (alarm) {
      alarm.stop();
      activeAlarmsRef.current.delete(eventId);
    }
  }, []);

  const stopAllAlarms = useCallback(() => {
    activeAlarmsRef.current.forEach(alarm => alarm.stop());
    activeAlarmsRef.current.clear();
  }, []);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkEvents = () => {
      const now = Date.now();
      const notified = getNotifiedSet();

      events.forEach(event => {
        if (notified.has(event.id)) return;
        if (event.duration === 'day' && !event.time) return;

        const eventTime = getEventDateTime(event).getTime();
        const notifyAt = eventTime - NOTIFY_BEFORE_MS;
        const diff = notifyAt - now;

        if (diff <= 0 && diff > -RETRY_INTERVAL_MS) {
          triggerAlarm(event);
        }
      });
    };

    checkEvents();
    checkIntervalRef.current = setInterval(checkEvents, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(checkIntervalRef.current);
    };
  }, [events, triggerAlarm]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        const eventData = events.map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          time: e.time,
          duration: e.duration
        }));
        reg.active?.postMessage({ type: 'SYNC_EVENTS', events: eventData });

        if (reg.periodicSync) {
          reg.periodicSync.register('check-events', { minInterval: 60000 }).catch(() => {});
        }
      });
    }
  }, [events]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'ALARM_TRIGGERED') {
        const event = events.find(ev => ev.id === e.data.eventId);
        if (event) triggerAlarm(event);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [events, triggerAlarm]);

  return { stopAlarm, stopAllAlarms, activeAlarms: activeAlarmsRef };
}
