import { ref, onUnmounted } from 'vue';
import {
  collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../firebase.js';
import { useAuth } from './useAuth.js';

export function useChat() {
  const messages = ref([]);
  const ready = ref(false);
  const error = ref('');
  let unsub = null;

  if (hasFirebaseConfig && db) {
    const q = query(collection(db, 'chat'), orderBy('createdAt', 'asc'), limit(500));
    unsub = onSnapshot(q,
      (snap) => {
        messages.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        ready.value = true;
      },
      (err) => { error.value = err.message; ready.value = true; }
    );
  } else {
    error.value = 'Firebase ikke konfigurert — chat er offline.';
    ready.value = true;
  }

  onUnmounted(() => { if (unsub) unsub(); });

  async function send(text) {
    const { current } = useAuth();
    const u = current.value;
    if (!u || !text.trim()) return;
    if (!hasFirebaseConfig || !db) throw new Error('Firebase ikke konfigurert');
    await addDoc(collection(db, 'chat'), {
      text: text.trim(),
      senderName: u.name,
      senderId: u.uid,
      createdAt: serverTimestamp(),
    });
  }

  return { messages, ready, error, send };
}
