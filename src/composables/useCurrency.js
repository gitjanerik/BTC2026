import { ref } from 'vue';

const CACHE_KEY = 'btc2026.fx';
const CACHE_TTL = 1000 * 60 * 60 * 12;

const rate = ref(null); // NOK per 1 RON
const updatedAt = ref(null);
const loading = ref(false);
const error = ref('');

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function writeCache(nokPerRon) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ rate: nokPerRon, ts: Date.now() }));
}

async function fetchRate() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/RON');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const nok = data?.rates?.NOK;
    if (!nok) throw new Error('NOK mangler i svar');
    rate.value = nok;
    updatedAt.value = Date.now();
    writeCache(nok);
  } catch (e) {
    error.value = e.message || 'Kunne ikke hente kurs';
  } finally {
    loading.value = false;
  }
}

export function useCurrency() {
  if (rate.value === null) {
    const cached = readCache();
    if (cached) {
      rate.value = cached.rate;
      updatedAt.value = cached.ts;
    } else {
      fetchRate();
    }
  }
  return { rate, updatedAt, loading, error, refresh: fetchRate };
}
