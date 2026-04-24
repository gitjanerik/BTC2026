import { ref, computed } from 'vue';
import {
  collection, collectionGroup, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../firebase.js';
import { useAuth } from './useAuth.js';

const CHAT_SEEN_KEY = 'btc2026.chat.lastSeen';
const BINGO_SEEN_KEY = 'btc2026.bingo.lastSeen';

function loadSeen(key) {
  const v = localStorage.getItem(key);
  return v ? parseInt(v, 10) || 0 : 0;
}

const lastSeenChat = ref(loadSeen(CHAT_SEEN_KEY));
const lastSeenBingo = ref(loadSeen(BINGO_SEEN_KEY));

const chatMessages = ref([]);
const bingoPhotos = ref([]);
let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  if (!hasFirebaseConfig || !db) return;

  const qChat = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limit(200));
  onSnapshot(qChat, (snap) => {
    chatMessages.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }, () => {});

  onSnapshot(collectionGroup(db, 'items'), (snap) => {
    const list = [];
    snap.docs.forEach((d) => {
      const parentUserId = d.ref.parent.parent?.id;
      const parentCollection = d.ref.parent.parent?.parent?.id;
      if (parentCollection !== 'bingo') return;
      list.push({ userId: parentUserId, itemId: d.id, ...d.data() });
    });
    bingoPhotos.value = list;
  }, () => {});
}

export function useUnread() {
  init();
  const { current } = useAuth();

  const unreadChat = computed(() => {
    const u = current.value;
    if (!u) return 0;
    const n = chatMessages.value.filter((m) => {
      if (m.senderId === u.uid) return false;
      const t = m.createdAt?.toMillis ? m.createdAt.toMillis() : 0;
      return t > lastSeenChat.value;
    }).length;
    return n > 99 ? 99 : n;
  });

  const unreadBingo = computed(() => {
    const u = current.value;
    if (!u) return 0;
    const n = bingoPhotos.value.filter((p) => {
      if (!p.photoUrl) return false;
      if (p.byName === u.name) return false;
      const t = p.completedAt?.toMillis ? p.completedAt.toMillis() : 0;
      return t > lastSeenBingo.value;
    }).length;
    return n > 99 ? 99 : n;
  });

  function markChatSeen() {
    lastSeenChat.value = Date.now();
    localStorage.setItem(CHAT_SEEN_KEY, String(lastSeenChat.value));
  }

  function markBingoSeen() {
    lastSeenBingo.value = Date.now();
    localStorage.setItem(BINGO_SEEN_KEY, String(lastSeenBingo.value));
  }

  return { unreadChat, unreadBingo, markChatSeen, markBingoSeen };
}
