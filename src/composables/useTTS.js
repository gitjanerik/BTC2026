import { ref, onMounted } from 'vue';

const voices = ref([]);
const hasRoVoice = ref(false);
let loaded = false;

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  voices.value = list;
  hasRoVoice.value = list.some((v) => v.lang && v.lang.toLowerCase().startsWith('ro'));
}

export function useTTS() {
  onMounted(() => {
    if (loaded) return;
    loaded = true;
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  });

  function speak(text) {
    if (!('speechSynthesis' in window)) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ro-RO';
    const ro = voices.value.find((v) => v.lang && v.lang.toLowerCase().startsWith('ro'));
    if (ro) u.voice = ro;
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }

  return { voices, hasRoVoice, speak };
}
