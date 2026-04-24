import { ref, watch } from 'vue';

const FONT_KEY = 'btc2026.settings.fontScale';
const THEME_KEY = 'btc2026.settings.theme';
const CHAT_SOUND_KEY = 'btc2026.settings.chatSound';
const CHAT_NOTIFY_KEY = 'btc2026.settings.chatNotify';
const WELCOME_KEY = 'btc2026.settings.welcomeSeen';

function readInt(key, fallback) {
  const v = parseInt(localStorage.getItem(key) || '', 10);
  return Number.isFinite(v) ? v : fallback;
}

function readBool(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === '1') return true;
  if (v === '0') return false;
  return fallback;
}

const fontScale = ref(readInt(FONT_KEY, 1));
const theme = ref(localStorage.getItem(THEME_KEY) || 'light');
const chatSound = ref(readBool(CHAT_SOUND_KEY, true));
const chatNotify = ref(readBool(CHAT_NOTIFY_KEY, true));
const welcomeSeen = ref(localStorage.getItem(WELCOME_KEY) === '1');

function apply() {
  const root = document.documentElement;
  root.setAttribute('data-fontscale', String(fontScale.value));
  if (theme.value === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

watch(fontScale, (v) => {
  localStorage.setItem(FONT_KEY, String(v));
  apply();
});

watch(theme, (v) => {
  localStorage.setItem(THEME_KEY, v);
  apply();
});

watch(chatSound, (v) => {
  localStorage.setItem(CHAT_SOUND_KEY, v ? '1' : '0');
});

watch(chatNotify, (v) => {
  localStorage.setItem(CHAT_NOTIFY_KEY, v ? '1' : '0');
});

watch(welcomeSeen, (v) => {
  localStorage.setItem(WELCOME_KEY, v ? '1' : '0');
});

apply();

export function useSettings() {
  function setFontScale(n) {
    fontScale.value = Math.max(1, Math.min(3, Number(n) || 1));
  }
  function setTheme(t) {
    theme.value = t === 'dark' ? 'dark' : 'light';
  }
  function setChatSound(v) { chatSound.value = !!v; }
  function setChatNotify(v) { chatNotify.value = !!v; }
  function markWelcomeSeen() { welcomeSeen.value = true; }
  return {
    fontScale, theme, chatSound, chatNotify, welcomeSeen,
    setFontScale, setTheme, setChatSound, setChatNotify, markWelcomeSeen,
  };
}
