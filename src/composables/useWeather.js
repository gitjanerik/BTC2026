import { ref, watch, isRef } from 'vue';

// Datakilde: api.met.no (yr). Fri bruk, men vær snill: caches aggresivt her.
// Kompakt-endpoint: hver time ~48t fram, deretter 6t-intervaller opp til ~10 dager.

const CACHE_KEY = 'btc2026.weather';
const CACHE_TTL = 30 * 60 * 1000;

export const LOCATIONS = [
  { id: 'aviatorilor', label: 'Aviatorilor (base)', lat: 44.4659, lng: 26.0889 },
  { id: 'old-town',    label: 'Old Town',           lat: 44.4309, lng: 26.1025 },
  { id: 'therme',      label: 'Therme',             lat: 44.6056, lng: 26.0753 },
  { id: 'parliament',  label: 'Parliament',         lat: 44.4275, lng: 26.0873 },
  { id: 'village',     label: 'Landsbymuseet',      lat: 44.4691, lng: 26.0783 },
];

function readCache(id) {
  try {
    const raw = localStorage.getItem(CACHE_KEY + '.' + id);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || Date.now() - obj.ts > CACHE_TTL) return null;
    return obj;
  } catch { return null; }
}

function writeCache(id, data) {
  try {
    localStorage.setItem(CACHE_KEY + '.' + id, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function useWeather(locationRef) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref('');
  const fetchedAt = ref(null);

  async function load(force = false) {
    const loc = isRef(locationRef) ? locationRef.value : locationRef;
    if (!loc) return;
    error.value = '';
    if (!force) {
      const cached = readCache(loc.id);
      if (cached) {
        data.value = cached.data;
        fetchedAt.value = cached.ts;
        return;
      }
    }
    loading.value = true;
    try {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${loc.lat}&lon=${loc.lng}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      data.value = json;
      fetchedAt.value = Date.now();
      writeCache(loc.id, json);
    } catch (e) {
      error.value = e.message || 'Kunne ikke hente prognose';
    } finally {
      loading.value = false;
    }
  }

  if (isRef(locationRef)) {
    watch(locationRef, () => load(), { immediate: true });
  } else {
    load();
  }

  return { data, loading, error, fetchedAt, refresh: () => load(true) };
}
