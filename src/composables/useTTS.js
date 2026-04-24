import { ref, computed, onMounted } from 'vue';

const VOICE_PREF_KEY = 'btc2026.tts.voicePref';

const voices = ref([]);
const hasRoVoice = ref(false);
const voicePref = ref(localStorage.getItem(VOICE_PREF_KEY) || 'female');
let loaded = false;

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  voices.value = list;
  hasRoVoice.value = list.some((v) => v.lang && v.lang.toLowerCase().startsWith('ro'));
}

const roVoices = computed(() => voices.value.filter((v) => v.lang && v.lang.toLowerCase().startsWith('ro')));

function genderOf(v) {
  const name = (v.name || '').toLowerCase();
  if (/\b(female|woman|ioana|carmen|andreea|anca|maria|cristina|mihaela)\b/.test(name)) return 'female';
  if (/\b(male|man|ioan|vlad|andrei|mihai|alexandru|cristian|nicolae)\b/.test(name)) return 'male';
  // Google TTS naming: -A/-C typically female, -B/-D male
  const m = v.name?.match(/-([A-D])$/i);
  if (m) return ['A', 'C'].includes(m[1].toUpperCase()) ? 'female' : 'male';
  return null;
}

const femaleVoice = computed(() => roVoices.value.find((v) => genderOf(v) === 'female') || null);
const maleVoice = computed(() => roVoices.value.find((v) => genderOf(v) === 'male') || null);

const hasFemale = computed(() => !!femaleVoice.value);
const hasMale = computed(() => !!maleVoice.value);

export function useTTS() {
  onMounted(() => {
    if (loaded) return;
    loaded = true;
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  });

  function setVoicePref(g) {
    voicePref.value = g === 'male' ? 'male' : 'female';
    localStorage.setItem(VOICE_PREF_KEY, voicePref.value);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ro-RO';
    const preferred = voicePref.value === 'male' ? maleVoice.value : femaleVoice.value;
    const fallback = roVoices.value[0];
    const voice = preferred || fallback;
    if (voice) u.voice = voice;
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  }

  return {
    voices, hasRoVoice,
    voicePref, setVoicePref,
    hasFemale, hasMale,
    speak,
  };
}
