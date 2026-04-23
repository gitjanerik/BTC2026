import { ref, onUnmounted } from 'vue';
import {
  collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../firebase.js';
import { useAuth } from './useAuth.js';

const SEEN_KEY = 'btc2026.broadcast.seenIds';
function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); }
}
function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-50)));
}

export function useGuideBroadcast(onNew) {
  const messages = ref([]);
  const ready = ref(false);
  const error = ref('');
  let unsub = null;
  const seen = loadSeen();
  let firstLoad = true;

  if (hasFirebaseConfig && db) {
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(30));
    unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      messages.value = list;
      if (!firstLoad && onNew) {
        const fresh = list.filter((m) => !seen.has(m.id));
        if (fresh.length) {
          fresh.forEach((m) => seen.add(m.id));
          saveSeen(seen);
          onNew(fresh[0]);
        }
      } else {
        list.forEach((m) => seen.add(m.id));
        saveSeen(seen);
      }
      firstLoad = false;
      ready.value = true;
    }, (err) => { error.value = err.message; ready.value = true; });
  } else {
    ready.value = true;
  }

  onUnmounted(() => { if (unsub) unsub(); });

  async function send(text) {
    const { current } = useAuth();
    const u = current.value;
    if (!u?.isGuide) throw new Error('Kun guide kan broadcaste');
    if (!text.trim()) return;
    if (!hasFirebaseConfig || !db) throw new Error('Firebase ikke konfigurert');
    await addDoc(collection(db, 'broadcasts'), {
      text: text.trim(),
      senderId: u.uid,
      senderName: u.name,
      createdAt: serverTimestamp(),
    });
  }

  return { messages, ready, error, send };
}

export async function ensureNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return 'default';
  }
}

export function showNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, { body, icon: '/BTC2026/icons/icon-192.png', badge: '/BTC2026/icons/icon-192.png' });
    return true;
  } catch {
    return false;
  }
}
