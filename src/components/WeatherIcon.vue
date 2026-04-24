<script setup>
import { computed } from 'vue';

const props = defineProps({
  code: { type: String, default: '' },
  size: { type: Number, default: 28 },
});

const kind = computed(() => {
  const c = props.code || '';
  if (!c) return 'unknown';
  if (c.includes('thunder')) return 'thunder';
  if (c.includes('sleet')) return 'sleet';
  if (c.includes('snow')) return 'snow';
  if (c.includes('rainshowers')) return 'showers';
  if (c.includes('rain') || c.includes('drizzle')) return 'rain';
  if (c.startsWith('fog')) return 'fog';
  if (c.startsWith('cloudy')) return 'cloudy';
  if (c.startsWith('partlycloudy')) return 'partly';
  if (c.startsWith('fair')) return 'fair';
  if (c.startsWith('clearsky')) return 'clear';
  return 'unknown';
});

const night = computed(() => (props.code || '').endsWith('_night'));
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- SUN (clear / fair day) -->
    <g v-if="(kind === 'clear' || kind === 'fair') && !night">
      <circle cx="16" cy="15" r="5" fill="rgb(var(--c-orange))" stroke="rgb(var(--c-orange-dark))" />
      <g stroke="rgb(var(--c-orange-dark))" stroke-width="1.8">
        <line x1="16" y1="3"  x2="16" y2="6" />
        <line x1="16" y1="24" x2="16" y2="27" />
        <line x1="3"  y1="15" x2="6"  y2="15" />
        <line x1="26" y1="15" x2="29" y2="15" />
        <line x1="6.5"  y1="5.5"  x2="8.7"  y2="7.7" />
        <line x1="23.3" y1="22.3" x2="25.5" y2="24.5" />
        <line x1="6.5"  y1="24.5" x2="8.7"  y2="22.3" />
        <line x1="23.3" y1="7.7"  x2="25.5" y2="5.5" />
      </g>
    </g>

    <!-- MOON (clear / fair night) -->
    <path
      v-if="(kind === 'clear' || kind === 'fair') && night"
      d="M21 18a7 7 0 1 1-7-11 5.5 5.5 0 0 0 7 11z"
      fill="rgb(var(--c-mustard))"
      stroke="currentColor"
    />

    <!-- small sun/moon behind partly/fair clouds -->
    <g v-if="kind === 'partly' || kind === 'showers' || kind === 'fair'">
      <g v-if="!night && (kind === 'partly' || kind === 'showers')">
        <circle cx="11" cy="11" r="3.2" fill="rgb(var(--c-orange))" stroke="rgb(var(--c-orange-dark))" />
        <g stroke="rgb(var(--c-orange-dark))" stroke-width="1.5">
          <line x1="11" y1="3"  x2="11" y2="5" />
          <line x1="3"  y1="11" x2="5"  y2="11" />
          <line x1="5.3" y1="5.3" x2="6.8" y2="6.8" />
          <line x1="15.2" y1="6.8" x2="16.7" y2="5.3" />
        </g>
      </g>
      <path
        v-if="night && kind !== 'fair'"
        d="M15 13a4.5 4.5 0 1 1-4.5-7 3.6 3.6 0 0 0 4.5 7z"
        fill="rgb(var(--c-mustard))"
        stroke="currentColor"
        stroke-width="1.4"
      />
    </g>

    <!-- CLOUD (all cloudy/rain/snow/thunder/partly/fair) -->
    <path
      v-if="['fair','partly','cloudy','rain','showers','snow','sleet','thunder'].includes(kind)"
      d="M9 22h14a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6-1A4 4 0 0 0 9 22z"
      fill="rgb(var(--c-paper))"
      stroke="currentColor"
      stroke-width="1.7"
    />

    <!-- RAIN drops -->
    <g v-if="kind === 'rain'" stroke="currentColor" stroke-width="1.6">
      <line x1="12"  y1="24" x2="10.8" y2="28" />
      <line x1="16"  y1="24" x2="14.8" y2="28" />
      <line x1="20"  y1="24" x2="18.8" y2="28" />
    </g>

    <!-- SHOWERS (rainshowers): 2 drops -->
    <g v-if="kind === 'showers'" stroke="currentColor" stroke-width="1.6">
      <line x1="13" y1="24" x2="12" y2="27.5" />
      <line x1="19" y1="24" x2="18" y2="27.5" />
    </g>

    <!-- SNOW -->
    <g v-if="kind === 'snow'" stroke="currentColor" stroke-width="1.4">
      <line x1="12" y1="24" x2="12" y2="28" />
      <line x1="10.3" y1="26" x2="13.7" y2="26" />
      <line x1="20" y1="24" x2="20" y2="28" />
      <line x1="18.3" y1="26" x2="21.7" y2="26" />
    </g>

    <!-- SLEET: drop + flake -->
    <g v-if="kind === 'sleet'" stroke="currentColor" stroke-width="1.5">
      <line x1="12" y1="24" x2="11" y2="27.5" />
      <g stroke-width="1.3">
        <line x1="19" y1="24" x2="19" y2="27.5" />
        <line x1="17.7" y1="25.7" x2="20.3" y2="25.7" />
      </g>
    </g>

    <!-- THUNDER: bolt -->
    <path
      v-if="kind === 'thunder'"
      d="M17 23l-3.5 4.5h2.5L15 31l4-5h-2.5l1-3z"
      fill="rgb(var(--c-sovred))"
      stroke="rgb(var(--c-sovred))"
      stroke-width="1"
    />

    <!-- FOG: horizontal lines -->
    <g v-if="kind === 'fog'" stroke="currentColor" stroke-width="1.8">
      <line x1="5"  y1="11" x2="27" y2="11" />
      <line x1="5"  y1="16" x2="27" y2="16" />
      <line x1="5"  y1="21" x2="27" y2="21" />
    </g>

    <!-- fallback -->
    <text
      v-if="kind === 'unknown'"
      x="16" y="21"
      text-anchor="middle"
      font-size="16"
      font-family="monospace"
      fill="currentColor"
      stroke="none"
    >·</text>
  </svg>
</template>
