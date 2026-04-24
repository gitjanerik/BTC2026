import { ref } from 'vue';

const deferred = ref(null);
const installed = ref(false);

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = window.navigator?.standalone === true;
  return !!(mm || iosStandalone);
}

const isStandalone = ref(detectStandalone());
const isIOS = ref(/iPad|iPhone|iPod/.test(navigator.userAgent || ''));
const isAndroid = ref(/Android/i.test(navigator.userAgent || ''));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred.value = e;
  });
  window.addEventListener('appinstalled', () => {
    deferred.value = null;
    installed.value = true;
    isStandalone.value = true;
  });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (e) => {
    isStandalone.value = e.matches;
  });
}

export function useInstallPrompt() {
  async function install() {
    if (!deferred.value) return 'unavailable';
    try {
      deferred.value.prompt();
      const choice = await deferred.value.userChoice;
      deferred.value = null;
      return choice.outcome;
    } catch {
      return 'error';
    }
  }

  return {
    canPrompt: deferred,
    isStandalone,
    isIOS,
    isAndroid,
    installed,
    install,
  };
}
