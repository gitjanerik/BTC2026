<script setup>
import { computed } from 'vue';

const props = defineProps({
  points: { type: Array, required: true }, // [{ time, temp, precip }]
  height: { type: Number, default: 110 },
  showAxis: { type: Boolean, default: true },
  showHours: { type: Boolean, default: true },
});

const width = 600;
const padding = { top: 14, right: 10, bottom: 20, left: 28 };

const innerW = computed(() => width - padding.left - padding.right);
const innerH = computed(() => props.height - padding.top - padding.bottom);

const temps = computed(() => props.points.map((p) => p.temp).filter((t) => Number.isFinite(t)));
const tMin = computed(() => (temps.value.length ? Math.min(...temps.value, 0) : 0));
const tMax = computed(() => (temps.value.length ? Math.max(...temps.value, tMin.value + 1) : 1));
const tRange = computed(() => Math.max(1, tMax.value - tMin.value));

const precips = computed(() => props.points.map((p) => p.precip || 0));
const pMax = computed(() => Math.max(1, ...precips.value));

function x(i) {
  const n = props.points.length;
  if (n <= 1) return padding.left;
  return padding.left + (i / (n - 1)) * innerW.value;
}

const TEMP_BAND = 0.68;
const PRECIP_BAND = 0.28;

function yTemp(t) {
  const frac = (t - tMin.value) / tRange.value;
  return padding.top + (1 - frac) * innerH.value * TEMP_BAND;
}

const tempPath = computed(() =>
  props.points
    .map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + yTemp(p.temp).toFixed(1))
    .join(' '),
);

const tempAreaPath = computed(() => {
  if (!props.points.length) return '';
  const baseline = padding.top + innerH.value * TEMP_BAND;
  const first = x(0).toFixed(1);
  const last = x(props.points.length - 1).toFixed(1);
  return `M${first},${baseline} ` +
    props.points.map((p, i) => 'L' + x(i).toFixed(1) + ',' + yTemp(p.temp).toFixed(1)).join(' ') +
    ` L${last},${baseline} Z`;
});

const precipBars = computed(() => {
  const n = props.points.length;
  const slot = innerW.value / Math.max(1, n);
  const barW = Math.max(2, slot * 0.65);
  const fullH = innerH.value * PRECIP_BAND;
  const baseY = padding.top + innerH.value;
  return props.points.map((p, i) => {
    const h = pMax.value > 0 ? (p.precip / pMax.value) * fullH : 0;
    return {
      x: (x(i) - barW / 2).toFixed(1),
      y: (baseY - h).toFixed(1),
      w: barW.toFixed(1),
      h: h.toFixed(1),
      wet: (p.precip || 0) > 0.05,
    };
  });
});

const ticks = computed(() => {
  return props.points
    .map((p, i) => {
      const d = new Date(p.time);
      const hour = d.getHours();
      const isMidnight = hour === 0;
      const isNoon = hour === 12;
      const every = props.points.length > 24 ? 6 : 3;
      if (!(hour % every === 0 || i === 0 || i === props.points.length - 1)) return null;
      return {
        x: x(i),
        label: isMidnight
          ? d.toLocaleDateString('no-NO', { weekday: 'short' })
          : hour.toString().padStart(2, '0'),
        strong: isMidnight || isNoon,
      };
    })
    .filter(Boolean);
});

const midnights = computed(() =>
  props.points
    .map((p, i) => {
      const d = new Date(p.time);
      return d.getHours() === 0 ? x(i) : null;
    })
    .filter((v) => v !== null),
);

const zeroLineY = computed(() => (tMin.value < 0 && tMax.value > 0 ? yTemp(0) : null));
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    class="w-full block"
    :style="`height:${height}px`"
    role="img"
    aria-label="Meteogram"
  >
    <!-- midnight separators -->
    <line
      v-for="(mx, i) in midnights"
      :key="'m' + i"
      :x1="mx"
      :y1="padding.top"
      :x2="mx"
      :y2="height - padding.bottom"
      stroke="currentColor"
      stroke-opacity="0.12"
      stroke-dasharray="2 3"
    />

    <!-- baseline -->
    <line
      :x1="padding.left"
      :y1="padding.top + innerH"
      :x2="padding.left + innerW"
      :y2="padding.top + innerH"
      stroke="currentColor"
      stroke-opacity="0.35"
      stroke-width="1"
    />

    <!-- zero line -->
    <line
      v-if="zeroLineY !== null"
      :x1="padding.left"
      :y1="zeroLineY"
      :x2="padding.left + innerW"
      :y2="zeroLineY"
      stroke="currentColor"
      stroke-opacity="0.2"
      stroke-dasharray="1 3"
    />

    <!-- precipitation bars -->
    <rect
      v-for="(b, i) in precipBars"
      :key="'p' + i"
      :x="b.x"
      :y="b.y"
      :width="b.w"
      :height="b.h"
      fill="rgb(var(--c-forest))"
      :fill-opacity="b.wet ? 0.75 : 0"
    />

    <!-- temperature area -->
    <path :d="tempAreaPath" fill="rgb(var(--c-mustard))" fill-opacity="0.28" />

    <!-- temperature line (gul/mustard) -->
    <path
      :d="tempPath"
      stroke="rgb(var(--c-mustard))"
      stroke-width="2.5"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- temperature dots -->
    <circle
      v-for="(p, i) in points"
      :key="'c' + i"
      :cx="x(i)"
      :cy="yTemp(p.temp)"
      r="1.6"
      fill="rgb(var(--c-ink))"
      fill-opacity="0.55"
    />

    <!-- y-axis labels -->
    <g v-if="showAxis" font-size="9" fill="currentColor" fill-opacity="0.65" font-family="monospace">
      <text :x="padding.left - 4" :y="yTemp(tMax) + 3" text-anchor="end">{{ Math.round(tMax) }}°</text>
      <text :x="padding.left - 4" :y="yTemp(tMin) + 3" text-anchor="end">{{ Math.round(tMin) }}°</text>
    </g>

    <!-- x-axis ticks -->
    <g v-if="showHours" font-size="9" fill="currentColor" font-family="monospace">
      <text
        v-for="(t, i) in ticks"
        :key="'t' + i"
        :x="t.x"
        :y="height - 5"
        text-anchor="middle"
        :fill-opacity="t.strong ? 0.85 : 0.5"
      >{{ t.label }}</text>
    </g>
  </svg>
</template>
