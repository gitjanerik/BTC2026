import { ref, computed } from 'vue';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, hasFirebaseConfig } from '../firebase.js';
import { users } from '../data/users.js';

const STORAGE_KEY = 'btc2026.user';

const stored = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
})();

const state = ref(stored);
const firebaseUid = ref(null);

if (hasFirebaseConfig && auth) {
  onAuthStateChanged(auth, (fbUser) => {
    firebaseUid.value = fbUser ? fbUser.uid : null;
    if (state.value && fbUser && state.value.uid !== fbUser.uid) {
      state.value = { ...state.value, uid: fbUser.uid };
      persist();
    }
  });
}

function persist() {
  if (state.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  else localStorage.removeItem(STORAGE_KEY);
}

export function getCurrentUser() {
  return state.value;
}

export function useAuth() {
  const current = computed(() => state.value);
  const isGuide = computed(() => !!state.value?.isGuide);

  async function login(userId, pin) {
    const u = users.find((x) => x.id === userId);
    if (!u) throw new Error('Ukjent bruker');

    const guestPin = import.meta.env.VITE_APP_PIN_GUEST || '2026';
    const guidePin = import.meta.env.VITE_APP_PIN_GUIDE || '';
    const needed = u.isGuide ? guidePin : guestPin;

    if (!needed) throw new Error('PIN ikke konfigurert. Legg til i .env.local.');
    if (String(pin) !== String(needed)) throw new Error('Feil PIN');

    let uid = 'local-' + u.id;
    if (hasFirebaseConfig && auth) {
      const cred = await signInAnonymously(auth);
      uid = cred.user.uid;
    }

    state.value = { id: u.id, name: u.name, isGuide: u.isGuide, uid };
    persist();
    return state.value;
  }

  function logout() {
    state.value = null;
    persist();
  }

  return { current, isGuide, login, logout };
}
