import { ref, onUnmounted } from 'vue';
import {
  collection, collectionGroup, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, hasFirebaseConfig } from '../firebase.js';
import { useAuth } from './useAuth.js';

// { phraseId: { userId: { audioUrl, byName, recordedAt } } }
const all = ref({});
const ready = ref(false);
let initialized = false;

export { all as phraseRecordings };

function init() {
  if (initialized || !hasFirebaseConfig || !db) return;
  initialized = true;
  onSnapshot(collectionGroup(db, 'recordings'), (snap) => {
    const byPhrase = {};
    snap.docs.forEach((d) => {
      const parent = d.ref.parent.parent;
      if (!parent || parent.parent?.id !== 'phrases') return;
      const phraseId = parent.id;
      if (!byPhrase[phraseId]) byPhrase[phraseId] = {};
      byPhrase[phraseId][d.id] = d.data();
    });
    all.value = byPhrase;
    ready.value = true;
  }, () => { ready.value = true; });
}

function audioExt(mime) {
  if (/mp4/.test(mime)) return 'm4a';
  if (/webm/.test(mime)) return 'webm';
  if (/ogg/.test(mime)) return 'ogg';
  return 'bin';
}

export function usePhraseRecordings() {
  init();
  const { current } = useAuth();

  async function save(phraseId, blob, mime) {
    if (!hasFirebaseConfig || !db || !storage) throw new Error('Firebase ikke konfigurert');
    const u = current.value;
    if (!u?.uid) throw new Error('Ikke innlogget');
    const ext = audioExt(mime);
    const path = `phrases/${phraseId}/${u.uid}.${ext}`;
    const r = storageRef(storage, path);
    await uploadBytes(r, blob, { contentType: mime || 'audio/webm' });
    const audioUrl = await getDownloadURL(r);
    await setDoc(doc(db, 'phrases', phraseId, 'recordings', u.uid), {
      audioUrl,
      storagePath: path,
      mime: mime || 'audio/webm',
      byName: u.name,
      recordedAt: serverTimestamp(),
    });
  }

  async function remove(phraseId) {
    if (!hasFirebaseConfig || !db) throw new Error('Firebase ikke konfigurert');
    const u = current.value;
    if (!u?.uid) throw new Error('Ikke innlogget');
    const existing = all.value[phraseId]?.[u.uid];
    if (existing?.storagePath && storage) {
      try { await deleteObject(storageRef(storage, existing.storagePath)); } catch {}
    }
    await deleteDoc(doc(db, 'phrases', phraseId, 'recordings', u.uid));
  }

  function listFor(phraseId) {
    const obj = all.value[phraseId] || {};
    return Object.entries(obj).map(([uid, data]) => ({ uid, ...data }));
  }

  function myFor(phraseId) {
    const u = current.value;
    if (!u?.uid) return null;
    return all.value[phraseId]?.[u.uid] || null;
  }

  return { all, ready, save, remove, listFor, myFor };
}
