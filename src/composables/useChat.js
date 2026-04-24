import { ref, computed, onUnmounted } from 'vue';
import {
  collection, collectionGroup, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp,
  doc, setDoc, deleteDoc, updateDoc,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../firebase.js';
import { useAuth } from './useAuth.js';

const TYPING_TTL_MS = 4000;
const TYPING_THROTTLE_MS = 2000;

export function useChat() {
  const messages = ref([]);
  const typing = ref([]);
  const reactions = ref({}); // { msgId: { uid: { emoji, name } } }
  const ready = ref(false);
  const error = ref('');
  const now = ref(Date.now());
  const unsubs = [];
  let lastTypingWrite = 0;
  let tickTimer = null;

  if (hasFirebaseConfig && db) {
    const q = query(collection(db, 'chat'), orderBy('createdAt', 'asc'), limit(500));
    unsubs.push(onSnapshot(q,
      (snap) => {
        messages.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        ready.value = true;
      },
      (err) => { error.value = err.message; ready.value = true; }
    ));

    unsubs.push(onSnapshot(collection(db, 'typing'), (snap) => {
      typing.value = snap.docs.map((d) => {
        const data = d.data();
        const at = data.at?.toMillis ? data.at.toMillis() : 0;
        return { uid: d.id, name: data.name, at };
      });
    }));

    unsubs.push(onSnapshot(collectionGroup(db, 'reactions'), (snap) => {
      const byMsg = {};
      snap.docs.forEach((d) => {
        const msgId = d.ref.parent.parent?.id;
        if (!msgId) return;
        if (!byMsg[msgId]) byMsg[msgId] = {};
        byMsg[msgId][d.id] = d.data();
      });
      reactions.value = byMsg;
    }));

    tickTimer = setInterval(() => { now.value = Date.now(); }, 1000);
  } else {
    error.value = 'Firebase ikke konfigurert — chat er offline.';
    ready.value = true;
  }

  const typingOthers = computed(() => {
    const { current } = useAuth();
    const myUid = current.value?.uid;
    return typing.value.filter((t) => t.uid !== myUid && t.at && (now.value - t.at) < TYPING_TTL_MS);
  });

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
    stopTyping();
  }

  async function editMessage(msgId, text) {
    if (!hasFirebaseConfig || !db) throw new Error('Firebase ikke konfigurert');
    const { current } = useAuth();
    const u = current.value;
    if (!u?.uid) throw new Error('Ikke innlogget');
    const msg = messages.value.find((m) => m.id === msgId);
    if (!msg) throw new Error('Melding ikke funnet');
    if (msg.senderId !== u.uid) throw new Error('Kan kun redigere egne meldinger');
    const clean = text.trim();
    if (!clean) return;
    await updateDoc(doc(db, 'chat', msgId), {
      text: clean,
      editedAt: serverTimestamp(),
    });
  }

  async function deleteMessage(msgId) {
    if (!hasFirebaseConfig || !db) throw new Error('Firebase ikke konfigurert');
    const { current } = useAuth();
    const u = current.value;
    if (!u?.uid) throw new Error('Ikke innlogget');
    const msg = messages.value.find((m) => m.id === msgId);
    if (!msg) return;
    if (msg.senderId !== u.uid) throw new Error('Kan kun slette egne meldinger');
    await deleteDoc(doc(db, 'chat', msgId));
  }

  async function toggleReaction(msgId, emoji) {
    if (!hasFirebaseConfig || !db) return;
    const { current } = useAuth();
    const u = current.value;
    if (!u?.uid) return;
    const ref = doc(db, 'chat', msgId, 'reactions', u.uid);
    const existing = reactions.value[msgId]?.[u.uid];
    if (existing?.emoji === emoji) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { emoji, name: u.name, at: serverTimestamp() });
    }
  }

  async function notifyTyping() {
    if (!hasFirebaseConfig || !db) return;
    const { current } = useAuth();
    const u = current.value;
    if (!u?.uid) return;
    const t = Date.now();
    if (t - lastTypingWrite < TYPING_THROTTLE_MS) return;
    lastTypingWrite = t;
    try {
      await setDoc(doc(db, 'typing', u.uid), { name: u.name, at: serverTimestamp() });
    } catch {}
  }

  async function stopTyping() {
    if (!hasFirebaseConfig || !db) return;
    const { current } = useAuth();
    const u = current.value;
    if (!u?.uid) return;
    lastTypingWrite = 0;
    try { await deleteDoc(doc(db, 'typing', u.uid)); } catch {}
  }

  onUnmounted(() => {
    unsubs.forEach((u) => u());
    if (tickTimer) clearInterval(tickTimer);
    stopTyping();
  });

  return {
    messages, ready, error, send,
    typingOthers, notifyTyping, stopTyping,
    reactions, toggleReaction,
    editMessage, deleteMessage,
  };
}
