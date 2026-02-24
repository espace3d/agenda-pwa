import { useEffect, useRef, useCallback } from 'react';
import { getEventDateTime } from '../utils/dateUtils';
import { getNotifiedSet, addNotified } from '../utils/storage';

const NOTIFY_BEFORE_MS = 30 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 5;
const CHECK_INTERVAL_MS = 15 * 1000;

let alarmAudio = null;

function getAlarmAudio() {
  if (!alarmAudio) {
    alarmAudio = new Audio('/alarm.wav');
    alarmAudio.loop = true;
    alarmAudio.volume = 1.0;
  }
  return alarmAudio;
}

function playAlarmSound() {
  try {
    const audio = getAlarmAudio();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}

function stopAlarmSound() {
  try {
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
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
        silent: false,
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
  // Pre-load the alarm audio so it's ready when needed
  try { getAlarmAudio(); } catch {}
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
      playAlarmSound();
      vibrate();
      showNotification(event);
    };

    const scheduleRetry = () => {
      if (stopped || retryCount >= MAX_RETRIES) {
        if (!stopped) stopAlarmSound();
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
      stopAlarmSound();
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
      if (e.data?.type === 'STOP_ALARM') {
        stopAlarm(e.data.eventId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [events, triggerAlarm, stopAlarm]);

  return { stopAlarm, stopAllAlarms, activeAlarms: activeAlarmsRef };
}
