import { ref, watch } from 'vue';

const FONT_KEY = 'btc2026.settings.fontScale';
const THEME_KEY = 'btc2026.settings.theme';

function readInt(key, fallback) {
  const v = parseInt(localStorage.getItem(key) || '', 10);
  return Number.isFinite(v) ? v : fallback;
}

const fontScale = ref(readInt(FONT_KEY, 1));
const theme = ref(localStorage.getItem(THEME_KEY) || 'light');

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

apply();

export function useSettings() {
  function setFontScale(n) {
    fontScale.value = Math.max(1, Math.min(3, Number(n) || 1));
  }
  function setTheme(t) {
    theme.value = t === 'dark' ? 'dark' : 'light';
  }
  return { fontScale, theme, setFontScale, setTheme };
}
