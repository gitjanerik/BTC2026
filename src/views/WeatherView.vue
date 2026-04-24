<script setup>
import { ref, computed } from 'vue';
import { useWeather, LOCATIONS } from '../composables/useWeather.js';
import Meteogram from '../components/Meteogram.vue';
import WeatherIcon from '../components/WeatherIcon.vue';

const current = ref(LOCATIONS[0]);
const { data, loading, error, fetchedAt, refresh } = useWeather(current);

const TRIP_START = '2026-04-24';
const TRIP_END   = '2026-04-27';

const timeseries = computed(() => data.value?.properties?.timeseries || []);
const updatedAt = computed(() => data.value?.properties?.meta?.updated_at);

function pickSymbol(t) {
  return (
    t.data.next_1_hours?.summary?.symbol_code ||
    t.data.next_6_hours?.summary?.symbol_code ||
    t.data.next_12_hours?.summary?.symbol_code ||
    null
  );
}

function pickPrecip(t) {
  return (
    t.data.next_1_hours?.details?.precipitation_amount ??
    t.data.next_6_hours?.details?.precipitation_amount ??
    0
  );
}

const allPoints = computed(() =>
  timeseries.value.map((t) => ({
    time: t.time,
    temp: t.data.instant.details.air_temperature,
    wind: t.data.instant.details.wind_speed,
    windDir: t.data.instant.details.wind_from_direction,
    precip: pickPrecip(t),
    symbol: pickSymbol(t),
  })),
);

// Korttid: de neste 48 timene (time-oppløst)
const shortTerm = computed(() => {
  const now = Date.now();
  const end = now + 48 * 3600 * 1000;
  return allPoints.value.filter((p) => {
    const ts = new Date(p.time).getTime();
    return ts >= now - 3600 * 1000 && ts <= end;
  });
});

// Grupperer pr. lokal dato
const byDay = computed(() => {
  const map = new Map();
  for (const p of allPoints.value) {
    const d = new Date(p.time);
    const key = d.toLocaleDateString('sv-SE'); // yyyy-mm-dd lokal
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return Array.from(map.entries())
    .map(([date, points]) => {
      const temps = points.map((p) => p.temp).filter(Number.isFinite);
      const precips = points.map((p) => p.precip);
      const winds = points.map((p) => p.wind).filter(Number.isFinite);
      return {
        date,
        points,
        min: temps.length ? Math.min(...temps) : null,
        max: temps.length ? Math.max(...temps) : null,
        precip: precips.reduce((a, b) => a + b, 0),
        wind: winds.length ? Math.max(...winds) : null,
        symbol: dominantSymbol(points),
      };
    })
    .filter((d) => d.points.length >= 2);
});

function dominantSymbol(points) {
  const counts = {};
  for (const p of points) if (p.symbol) counts[p.symbol] = (counts[p.symbol] || 0) + 1;
  let best = null;
  let n = 0;
  for (const [s, c] of Object.entries(counts)) if (c > n) { best = s; n = c; }
  return best;
}

const tripDays = computed(() =>
  byDay.value.filter((d) => d.date >= TRIP_START && d.date <= TRIP_END),
);

const longTerm = computed(() => byDay.value.slice(0, 10));

function dayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  return date.toLocaleDateString('no-NO', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

function pickLocation(loc) {
  current.value = loc;
}

const updatedText = computed(() => {
  const ts = updatedAt.value || fetchedAt.value;
  return ts ? new Date(ts).toLocaleString('no-NO') : '—';
});

const yrLink = computed(() => {
  const { lat, lng } = current.value;
  return `https://www.yr.no/nb/v%C3%A6rvarsel/daglig-tabell/${lat.toFixed(4)},${lng.toFixed(4)}`;
});

const windyEmbed = computed(() => {
  const { lat, lng } = current.value;
  return `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lng}&zoom=9&overlay=rain&level=surface&menu=&message=&marker=true&type=map`;
});
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
    <div class="text-center">
      <span class="ribbon text-[10px]">Meteorologisk direktorat</span>
      <h2 class="stencil text-3xl mt-2">Vær</h2>
      <p class="text-[11px] opacity-70 italic">data fra yr.no / met.no · oppdatert {{ updatedText }}</p>
    </div>

    <!-- Lokasjonsvelger -->
    <div class="flex flex-wrap gap-2 justify-center">
      <button
        v-for="loc in LOCATIONS"
        :key="loc.id"
        class="stamp-sm px-3 py-1 text-xs font-display uppercase"
        :class="current.id === loc.id ? 'bg-orange text-paper' : 'bg-paper'"
        @click="pickLocation(loc)"
      >{{ loc.label }}</button>
    </div>

    <div v-if="error" class="stamp p-3 bg-paper border-sovred">
      <p class="text-sovred text-sm">Kunne ikke hente prognose: {{ error }}</p>
      <button class="mt-2 btn btn-primary text-xs" @click="refresh">Prøv igjen</button>
    </div>
    <p v-else-if="loading && !data" class="text-center text-xs opacity-60">Henter værdata…</p>

    <!-- Korttid -->
    <section v-if="shortTerm.length" class="stamp bg-paper p-4 space-y-2">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="stencil text-lg">Korttid — 48 timer</h3>
        <span class="text-[10px] opacity-60 italic">timesoppløsning</span>
      </div>
      <Meteogram :points="shortTerm" :height="130" />
      <div class="flex items-center justify-between text-[10px] opacity-60 pt-1">
        <span>■ nedbør (mm)</span>
        <span>— temperatur (°C)</span>
      </div>

      <div class="overflow-x-auto -mx-4 px-4 mt-2">
        <div class="flex gap-2 min-w-max">
          <div
            v-for="(p, i) in shortTerm.filter((_, idx) => idx % 3 === 0).slice(0, 16)"
            :key="i"
            class="stamp-sm bg-paper px-2 py-1 text-center min-w-[56px]"
          >
            <div class="text-[9px] font-display opacity-70">{{ fmtTime(p.time) }}</div>
            <div class="flex justify-center leading-none" :title="p.symbol || ''">
              <WeatherIcon :code="p.symbol" :size="22" />
            </div>
            <div class="text-xs font-display">{{ Math.round(p.temp) }}°</div>
            <div class="text-[9px] opacity-60">{{ p.precip > 0.05 ? p.precip.toFixed(1) + 'mm' : '' }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Turens dager -->
    <section v-if="tripDays.length" class="stamp bg-paper p-4 space-y-3">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="stencil text-lg">Turens dager</h3>
        <span class="text-[10px] opacity-60 italic">24.–27. april 2026</span>
      </div>
      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="d in tripDays"
          :key="d.date"
          class="border-2 border-ink bg-paper/60 p-3"
        >
          <div class="flex items-center justify-between gap-2 mb-1">
            <div class="flex items-center gap-2">
              <WeatherIcon :code="d.symbol" :size="36" />
              <div>
                <div class="font-display uppercase text-sm">{{ dayLabel(d.date) }}</div>
                <div class="text-[10px] opacity-60">{{ d.points.length }} datapunkter</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-display">
                <span class="text-sovred">{{ Math.round(d.max) }}°</span>
                <span class="opacity-60"> / </span>
                <span class="text-forest">{{ Math.round(d.min) }}°</span>
              </div>
              <div class="text-[10px] opacity-70">
                <span v-if="d.precip > 0.1">{{ d.precip.toFixed(1) }} mm</span>
                <span v-else>tørt</span>
                <span v-if="d.wind"> · {{ Math.round(d.wind) }} m/s</span>
              </div>
            </div>
          </div>
          <Meteogram :points="d.points" :height="90" :show-axis="false" />
        </div>
      </div>
    </section>

    <!-- Langtid -->
    <section v-if="longTerm.length" class="stamp bg-paper p-4 space-y-3">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="stencil text-lg">Langtid — 10 dager</h3>
        <span class="text-[10px] opacity-60 italic">min/maks · sum nedbør</span>
      </div>
      <div class="space-y-2">
        <div
          v-for="d in longTerm"
          :key="d.date"
          class="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 py-1 border-b border-ink/10 last:border-0"
        >
          <span class="w-7 flex justify-center"><WeatherIcon :code="d.symbol" :size="26" /></span>
          <div class="text-xs font-display uppercase w-20">{{ dayLabel(d.date) }}</div>
          <div class="min-w-0">
            <Meteogram :points="d.points" :height="44" :show-axis="false" :show-hours="false" />
          </div>
          <div class="text-right text-xs font-display tabular-nums whitespace-nowrap">
            <span class="text-sovred">{{ Math.round(d.max) }}°</span>
            <span class="opacity-50">/</span>
            <span class="text-forest">{{ Math.round(d.min) }}°</span>
            <div class="text-[10px] opacity-60 font-body italic">
              {{ d.precip > 0.1 ? d.precip.toFixed(1) + ' mm' : '—' }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Kart -->
    <section class="stamp bg-paper p-4 space-y-2">
      <div class="flex items-baseline justify-between gap-2">
        <h3 class="stencil text-lg">Kart</h3>
        <span class="text-[10px] opacity-60 italic">regnkart · Windy</span>
      </div>
      <p class="text-[11px] opacity-70 italic">
        Yr sitt radar-kartlag dekker kun Norge, så for Bucuresti bruker vi Windy sitt offentlige kartlag
        (samme modelldata — ECMWF/GFS).
      </p>
      <div class="border-2 border-ink overflow-hidden" style="aspect-ratio: 4 / 3;">
        <iframe
          :src="windyEmbed"
          width="100%"
          height="100%"
          frameborder="0"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        <a
          :href="yrLink"
          target="_blank"
          rel="noopener"
          class="stamp-sm px-3 py-1 text-xs font-display uppercase bg-paper"
        >Åpne på yr.no</a>
        <button class="stamp-sm px-3 py-1 text-xs font-display uppercase bg-paper" @click="refresh">
          Oppdater
        </button>
      </div>
    </section>

    <p class="text-[10px] opacity-50 italic text-center pt-2">
      Værdata: MET Norway (CC BY 4.0) · api.met.no/locationforecast
    </p>
  </div>
</template>
