import { watch } from 'vue';
import { chatMessages, bingoPhotos, useUnread } from './useUnread.js';
import { phraseRecordings, usePhraseRecordings } from './usePhraseRecordings.js';
import { useAuth } from './useAuth.js';
import { useSettings } from './useSettings.js';

const FLUSH_MS = 60 * 1000;
const QUIET_START_HOUR = 0;  // inclusive
const QUIET_END_HOUR = 6;    // exclusive — quiet until 06:00

let started = false;
const seenChat = new Set();
const seenBingo = new Set();    // key: userId:itemId
const seenPhrase = new Set();   // key: phraseId:userId
let ctx = null;
let flushTimer = null;

// { chat: Set<name>, bingo: Set<name>, phrase: Set<name> }
const queue = { chat: new Set(), bingo: new Set(), phrase: new Set() };

function isQuietHours(d = new Date()) {
  const h = d.getHours();
  return h >= QUIET_START_HOUR && h < QUIET_END_HOUR;
}

function joinNames(names) {
  const arr = [...names];
  if (arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} og ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} og ${arr[arr.length - 1]}`;
}

function pling() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t0 = now + i * 0.09;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.28, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
      osc.start(t0);
      osc.stop(t0 + 0.35);
    });
  } catch {}
}

function showSystemNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body: body.slice(0, 300),
      icon: '/BTC2026/icons/icon-192.png',
      badge: '/BTC2026/icons/icon-192.png',
      tag: 'btc2026-activity',
      renotify: true,
    });
    n.onclick = () => {
      window.focus?.();
      n.close();
    };
  } catch {}
}

function currentRoute() {
  return (window.location.hash || '').replace(/^#/, '') || '/';
}

function routeMatchesEventType(type) {
  const r = currentRoute();
  if (type === 'chat') return r.startsWith('/chat');
  if (type === 'bingo') return r.startsWith('/bingo');
  if (type === 'phrase') return r.startsWith('/phrases');
  return false;
}

function flush() {
  if (isQuietHours()) {
    // discard anything queued during quiet hours
    queue.chat.clear();
    queue.bingo.clear();
    queue.phrase.clear();
    return;
  }
  const anyActivity = queue.chat.size + queue.bingo.size + queue.phrase.size > 0;
  if (!anyActivity) return;

  const { chatSound, chatNotify } = useSettings();
  const lines = [];

  if (queue.chat.size) {
    const names = joinNames(queue.chat);
    lines.push(`Ny melding i chat fra ${names}.`);
  }
  if (queue.bingo.size) {
    const names = joinNames(queue.bingo);
    lines.push(`Sjå her ja! Nytt bingotrekk fra ${names}. Sterkt!`);
  }
  if (queue.phrase.size) {
    const names = joinNames(queue.phrase);
    lines.push(`Hey! ${names} har lagt ut ny frase.`);
  }

  queue.chat.clear();
  queue.bingo.clear();
  queue.phrase.clear();

  if (chatSound.value) pling();

  if (chatNotify.value && 'Notification' in window && Notification.permission === 'granted') {
    const title = lines.length === 1 ? 'BTC-gutta' : 'BTC-gutta · flere oppdateringer';
    showSystemNotification(title, lines.join(' '));
  }
}

export async function requestChatNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'default';
  }
}

export function startChatNotifications() {
  if (started) return;
  started = true;

  let seededChat = false;
  let seededBingo = false;
  let seededPhrase = false;

  const { current } = useAuth();
  useUnread(); // initialize shared chat + bingo listeners
  usePhraseRecordings(); // ensure phrase-recording listener is running globally

  watch(chatMessages, (list) => {
    if (!seededChat) {
      list.forEach((m) => seenChat.add(m.id));
      seededChat = true;
      return;
    }
    const myUid = current.value?.uid;
    list.forEach((m) => {
      if (seenChat.has(m.id)) return;
      seenChat.add(m.id);
      if (!m.senderId || m.senderId === myUid) return;
      if (routeMatchesEventType('chat') && !document.hidden) return;
      if (isQuietHours()) return;
      queue.chat.add(m.senderName || 'Noen');
    });
  }, { deep: true });

  watch(bingoPhotos, (list) => {
    if (!seededBingo) {
      list.forEach((p) => seenBingo.add(`${p.userId}:${p.itemId}`));
      seededBingo = true;
      return;
    }
    const myName = current.value?.name;
    list.forEach((p) => {
      const key = `${p.userId}:${p.itemId}`;
      if (seenBingo.has(key)) return;
      seenBingo.add(key);
      if (!p.photoUrl) return; // only photo uploads count
      if (!p.byName || p.byName === myName) return;
      if (routeMatchesEventType('bingo') && !document.hidden) return;
      if (isQuietHours()) return;
      queue.bingo.add(p.byName);
    });
  }, { deep: true });

  watch(phraseRecordings, (byPhrase) => {
    const flat = [];
    Object.entries(byPhrase).forEach(([phraseId, users]) => {
      Object.entries(users).forEach(([uid, data]) => {
        flat.push({ key: `${phraseId}:${uid}`, uid, ...data });
      });
    });
    if (!seededPhrase) {
      flat.forEach((r) => seenPhrase.add(r.key));
      seededPhrase = true;
      return;
    }
    const myName = current.value?.name;
    flat.forEach((r) => {
      if (seenPhrase.has(r.key)) return;
      seenPhrase.add(r.key);
      if (!r.byName || r.byName === myName) return;
      if (routeMatchesEventType('phrase') && !document.hidden) return;
      if (isQuietHours()) return;
      queue.phrase.add(r.byName);
    });
  }, { deep: true });

  flushTimer = setInterval(flush, FLUSH_MS);
}
