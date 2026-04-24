import { ref } from 'vue';

const CACHE_KEY = 'btc2026.fx';
const CACHE_TTL = 1000 * 60 * 60 * 12;

// Rates are expressed per 1 RON
const rateNOK = ref(null);
const rateEUR = ref(null);
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

function writeCache(nokPerRon, eurPerRon) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ nok: nokPerRon, eur: eurPerRon, ts: Date.now() }));
}

async function fetchRate() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/RON');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const nok = data?.rates?.NOK;
    const eur = data?.rates?.EUR;
    if (!nok || !eur) throw new Error('NOK eller EUR mangler i svar');
    rateNOK.value = nok;
    rateEUR.value = eur;
    updatedAt.value = Date.now();
    writeCache(nok, eur);
  } catch (e) {
    error.value = e.message || 'Kunne ikke hente kurs';
  } finally {
    loading.value = false;
  }
}

export function useCurrency() {
  if (rateNOK.value === null) {
    const cached = readCache();
    if (cached && cached.nok && cached.eur) {
      rateNOK.value = cached.nok;
      rateEUR.value = cached.eur;
      updatedAt.value = cached.ts;
    } else {
      fetchRate();
    }
  }
  return { rateNOK, rateEUR, updatedAt, loading, error, refresh: fetchRate };
}
