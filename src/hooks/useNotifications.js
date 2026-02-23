import { useEffect, useRef, useCallback } from 'react';
import { getEventDateTime } from '../utils/dateUtils';
import { getNotifiedSet, addNotified } from '../utils/storage';

const NOTIFY_BEFORE_MS = 30 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 5;
const CHECK_INTERVAL_MS = 15 * 1000;

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeeps() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.4;
      const start = now + i * 0.4;
      osc.start(start);
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
      osc.stop(start + 0.2);
    }
  } catch (e) {
    console.warn('Beep failed:', e);
  }
}

function vibrate() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200, 100, 200, 100, 200]);
    }
  } catch {}
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function showNotification(event) {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const timeStr = event.time ? ` à ${event.time.replace(':', 'h')}` : '';
  const [y, m, d] = event.date.split('-');
  const dateStr = `${d}/${m}/${y}`;
  const body = `${dateStr}${timeStr} — dans 30 minutes`;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(`⏳ ${event.title}`, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `event-${event.id}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200, 100, 200, 100, 200],
        actions: [{ action: 'stop', title: 'Arrêter' }]
      });
      return;
    }
  } catch {}

  try {
    new Notification(`⏳ ${event.title}`, {
      body,
      icon: '/icons/icon-192.png',
      tag: `event-${event.id}`
    });
  } catch {}
}

export function requestNotificationPermission() {
  ensureNotificationPermission();
  try { getAudioContext(); } catch {}
}

export function useNotifications(events) {
  const activeAlarmsRef = useRef(new Map());
  const checkIntervalRef = useRef(null);

  const triggerAlarm = useCallback((event) => {
    if (activeAlarmsRef.current.has(event.id)) return;

    let retryCount = 0;
    let retryTimer = null;
    let stopped = false;

    const runSequence = () => {
      if (stopped) return;
      playBeeps();
      vibrate();
      showNotification(event);
    };

    const scheduleRetry = () => {
      if (stopped || retryCount >= MAX_RETRIES) {
        activeAlarmsRef.current.delete(event.id);
        return;
      }
      retryTimer = setTimeout(() => {
        retryCount++;
        runSequence();
        scheduleRetry();
      }, RETRY_INTERVAL_MS);
    };

    const stop = () => {
      stopped = true;
      clearTimeout(retryTimer);
      activeAlarmsRef.current.delete(event.id);
    };

    activeAlarmsRef.current.set(event.id, { stop });
    addNotified(event.id);
    runSequence();
    scheduleRetry();
  }, []);

  const stopAlarm = useCallback((eventId) => {
    const alarm = activeAlarmsRef.current.get(eventId);
    if (alarm) alarm.stop();
  }, []);

  const stopAllAlarms = useCallback(() => {
    activeAlarmsRef.current.forEach(alarm => alarm.stop());
    activeAlarmsRef.current.clear();
  }, []);

  useEffect(() => {
    const checkEvents = () => {
      const now = Date.now();
      const notified = getNotifiedSet();

      events.forEach(event => {
        if (notified.has(event.id)) return;
        if (activeAlarmsRef.current.has(event.id)) return;
        if (event.duration === 'day' && !event.time) return;

        const eventTime = getEventDateTime(event).getTime();
        const notifyAt = eventTime - NOTIFY_BEFORE_MS;
        const diff = now - notifyAt;

        if (diff >= 0 && diff < NOTIFY_BEFORE_MS) {
          triggerAlarm(event);
        }
      });
    };

    checkEvents();
    checkIntervalRef.current = setInterval(checkEvents, CHECK_INTERVAL_MS);

    return () => clearInterval(checkIntervalRef.current);
  }, [events, triggerAlarm]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      const eventData = events.map(e => ({
        id: e.id, title: e.title, date: e.date, time: e.time, duration: e.duration
      }));
      reg.active?.postMessage({ type: 'SYNC_EVENTS', events: eventData });

      if (reg.periodicSync) {
        reg.periodicSync.register('check-events', { minInterval: 60000 }).catch(() => {});
      }
    });
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
