import { useState, useEffect, useRef, useCallback } from 'react';
import { getEventDateTime } from '../utils/dateUtils';
import { getNotifiedSet, addNotified } from '../utils/storage';

const STAGES = [
  { offset: 30 * 60 * 1000, key: '30', label: 'dans 30 minutes' },
  { offset: 10 * 60 * 1000, key: '10', label: 'dans 10 minutes' },
  { offset: 0, key: '0', label: "c'est l'heure !" },
];
const NOTIFY_WINDOW_MS = 5 * 60 * 1000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 5;
const CHECK_INTERVAL_MS = 15 * 1000;
const SYNC_DEBOUNCE_MS = 2000;
const MAX_FUTURE_DAYS = 31;

let alarmAudio = null;
let alarmPlayCount = 0;
let alarmStopped = false;

function getAlarmAudio() {
  if (!alarmAudio) {
    alarmAudio = new Audio('/alarm.wav');
    alarmAudio.loop = false;
    alarmAudio.volume = 1.0;
    alarmAudio.addEventListener('ended', () => {
      alarmPlayCount++;
      if (alarmPlayCount < 5 && !alarmStopped) {
        alarmAudio.currentTime = 0;
        alarmAudio.play().catch(() => {});
      }
    });
  }
  return alarmAudio;
}

function playAlarmSound() {
  try {
    const audio = getAlarmAudio();
    alarmPlayCount = 0;
    alarmStopped = false;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}

function stopAlarmSound() {
  try {
    alarmStopped = true;
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

async function showNotification(event, label) {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const timeStr = event.time ? ` à ${event.time.replace(':', 'h')}` : '';
  const [y, m, d] = event.date.split('-');
  const dateStr = `${d}/${m}/${y}`;
  const body = `${dateStr}${timeStr} — ${label}`;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) {
      await reg.showNotification(`⏳ ${event.title}`, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `event-${event.id}`,
        data: { eventId: event.id },
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

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function getPushSubscription() {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (subscription) return subscription;

    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    return subscription;
  } catch {
    return null;
  }
}

let syncTimer = null;

async function syncPushSubscription(events) {
  const subscription = await getPushSubscription();
  if (!subscription) return;

  const now = Date.now();
  const maxFuture = now + MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000;

  const futureEvents = events
    .filter(e => {
      if (e.duration === 'day' && !e.time) return false;
      if (!e.time) return false;
      const eventTime = getEventDateTime(e).getTime();
      return eventTime > now && eventTime < maxFuture;
    })
    .map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      time: e.time,
      duration: e.duration,
    }));

  try {
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        events: futureEvents,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
  } catch {}
}

export function requestNotificationPermission() {
  ensureNotificationPermission();
  try { getAlarmAudio(); } catch {}
}

export function useNotifications(events) {
  const activeAlarmsRef = useRef(new Map());
  const checkIntervalRef = useRef(null);
  const [alarmPopup, setAlarmPopup] = useState(null);
  const alarmPopupRef = useRef(null);

  const updatePopup = useCallback((value) => {
    alarmPopupRef.current = value;
    setAlarmPopup(value);
  }, []);

  const triggerAlarm = useCallback((event, stage) => {
    // Stop previous alarm for this event (previous stage) silently
    const existing = activeAlarmsRef.current.get(event.id);
    if (existing) {
      existing.stopped = true;
      clearTimeout(existing.retryTimer);
      stopAlarmSound();
    }

    const alarm = { stopped: false, retryTimer: null, retryCount: 0 };

    const runSequence = () => {
      if (alarm.stopped) return;
      playAlarmSound();
      vibrate();
      showNotification(event, stage.label);
    };

    const scheduleRetry = () => {
      if (alarm.stopped || alarm.retryCount >= MAX_RETRIES) {
        if (!alarm.stopped) stopAlarmSound();
        return;
      }
      alarm.retryTimer = setTimeout(() => {
        alarm.retryCount++;
        runSequence();
        scheduleRetry();
      }, RETRY_INTERVAL_MS);
    };

    activeAlarmsRef.current.set(event.id, alarm);
    addNotified(`${event.id}-${stage.key}`);
    updatePopup({ event, label: stage.label });
    runSequence();
    scheduleRetry();
  }, [updatePopup]);

  const stopAlarm = useCallback((eventId) => {
    const alarm = activeAlarmsRef.current.get(eventId);
    if (alarm) {
      alarm.stopped = true;
      clearTimeout(alarm.retryTimer);
      stopAlarmSound();
      activeAlarmsRef.current.delete(eventId);
    }
    // Always clear popup
    updatePopup(null);
  }, [updatePopup]);

  const stopAllAlarms = useCallback(() => {
    activeAlarmsRef.current.forEach(alarm => {
      alarm.stopped = true;
      clearTimeout(alarm.retryTimer);
    });
    activeAlarmsRef.current.clear();
    stopAlarmSound();
    updatePopup(null);
  }, [updatePopup]);

  useEffect(() => {
    const checkEvents = () => {
      const now = Date.now();
      const notified = getNotifiedSet();

      events.forEach(event => {
        if (event.duration === 'day' && !event.time) return;

        const eventTime = getEventDateTime(event).getTime();

        STAGES.forEach(stage => {
          const stageKey = `${event.id}-${stage.key}`;
          if (notified.has(stageKey)) return;

          const triggerAt = eventTime - stage.offset;
          const diff = now - triggerAt;

          if (diff >= 0 && diff < NOTIFY_WINDOW_MS) {
            triggerAlarm(event, stage);
          }
        });
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

  // Sync push subscription with backend (debounced)
  useEffect(() => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncPushSubscription(events);
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimer) clearTimeout(syncTimer);
    };
  }, [events]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'ALARM_TRIGGERED') {
        const event = events.find(ev => ev.id === e.data.eventId);
        if (event) {
          const stage = STAGES.find(s => s.key === e.data.stageKey) || STAGES[2];
          triggerAlarm(event, stage);
        }
      }
      if (e.data?.type === 'STOP_ALARM') {
        stopAlarm(e.data.eventId);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [events, triggerAlarm, stopAlarm]);

  return { stopAlarm, stopAllAlarms, activeAlarms: activeAlarmsRef, alarmPopup };
}
