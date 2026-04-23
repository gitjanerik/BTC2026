import { ref, onUnmounted } from 'vue';
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, hasFirebaseConfig } from '../firebase.js';
import { useAuth } from './useAuth.js';

async function compressImage(file, maxDim = 1600, quality = 0.75) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  bitmap.close?.();
  return blob;
}

export function useBingo() {
  const { current } = useAuth();
  const everyones = ref({}); // { userId: { itemId: { photoUrl, completedAt } } }
  const ready = ref(false);
  const error = ref('');
  const unsubs = [];
  const usersKnown = ref(new Set());

  function watchUser(userId) {
    if (usersKnown.value.has(userId)) return;
    usersKnown.value.add(userId);
    const u = onSnapshot(collection(db, 'bingo', userId, 'items'), (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      everyones.value = { ...everyones.value, [userId]: map };
    });
    unsubs.push(u);
  }

  if (hasFirebaseConfig && db) {
    // Root collection listener to discover users
    const rootU = onSnapshot(collection(db, 'bingo'), (snap) => {
      snap.forEach((d) => watchUser(d.id));
      ready.value = true;
    }, (err) => { error.value = err.message; ready.value = true; });
    unsubs.push(rootU);
    // Always watch own user so new users show their own state immediately
    if (current.value?.uid) watchUser(current.value.uid);
  } else {
    ready.value = true;
    error.value = 'Firebase ikke konfigurert — bingo er offline.';
  }

  onUnmounted(() => unsubs.forEach((u) => u()));

  async function markDone(itemId, file) {
    if (!hasFirebaseConfig) throw new Error('Firebase ikke konfigurert');
    const u = current.value;
    if (!u?.uid) throw new Error('Ikke innlogget');
    let photoUrl = null;
    if (file) {
      const blob = await compressImage(file);
      const path = `bingo/${u.uid}/${itemId}.jpg`;
      const r = storageRef(storage, path);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      photoUrl = await getDownloadURL(r);
    }
    await setDoc(doc(db, 'bingo', u.uid, 'items', String(itemId)), {
      photoUrl,
      completedAt: serverTimestamp(),
      byName: u.name,
    });
  }

  async function unmark(itemId) {
    if (!hasFirebaseConfig) throw new Error('Firebase ikke konfigurert');
    const u = current.value;
    if (!u?.uid) throw new Error('Ikke innlogget');
    await deleteDoc(doc(db, 'bingo', u.uid, 'items', String(itemId)));
  }

  return { everyones, ready, error, markDone, unmark };
}
