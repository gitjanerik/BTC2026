import { watch } from 'vue';
import { chatMessages, useUnread } from './useUnread.js';
import { useAuth } from './useAuth.js';
import { useSettings } from './useSettings.js';

let started = false;
const seen = new Set();
let ctx = null;

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

function showSystemNotification(msg) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification('Ny melding — ' + (msg.senderName || 'Kanalen'), {
      body: (msg.text || '').slice(0, 140),
      icon: '/BTC2026/icons/icon-192.png',
      badge: '/BTC2026/icons/icon-192.png',
      tag: 'btc2026-chat',
      renotify: true,
    });
    n.onclick = () => {
      window.focus?.();
      if (window.location.hash !== '#/chat') window.location.hash = '#/chat';
      n.close();
    };
  } catch {}
}

function isChatFocused() {
  const onChat = window.location.hash.startsWith('#/chat');
  return onChat && !document.hidden;
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

  // seed seen with whatever is already there on startup, so we don't
  // fire a flood of pings for existing messages
  let seeded = false;

  const { chatSound, chatNotify } = useSettings();
  const { current } = useAuth();
  useUnread(); // ensure listeners are initialized

  watch(chatMessages, (list) => {
    if (!seeded) {
      list.forEach((m) => seen.add(m.id));
      seeded = true;
      return;
    }
    const myUid = current.value?.uid;
    const fresh = [];
    list.forEach((m) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        if (m.senderId && m.senderId !== myUid) fresh.push(m);
      }
    });
    if (!fresh.length) return;

    const focused = isChatFocused();
    if (!focused) {
      if (chatSound.value) pling();
      if (chatNotify.value && 'Notification' in window && Notification.permission === 'granted') {
        showSystemNotification(fresh[fresh.length - 1]);
      }
    }
  }, { deep: true });
}
