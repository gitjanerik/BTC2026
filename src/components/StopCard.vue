<script setup>
const props = defineProps({
  stop: { type: Object, required: true },
});

function streetViewUrl(loc) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${loc.lat},${loc.lng}`;
}
function mapsUrl(loc) {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
}
</script>

<template>
  <article class="stamp-sm bg-paper p-4 space-y-2">
    <header class="flex items-baseline justify-between gap-3">
      <span class="font-display uppercase text-xs bg-ink text-paper px-2 py-0.5">{{ stop.time }}</span>
      <span v-if="stop.location" class="text-[10px] opacity-60 truncate">{{ stop.location.name }}</span>
    </header>
    <h3 class="font-display text-lg leading-tight">{{ stop.title }}</h3>
    <p v-if="stop.desc" class="text-sm leading-snug">{{ stop.desc }}</p>
    <div v-if="stop.location" class="flex gap-2 pt-1">
      <a :href="mapsUrl(stop.location)" target="_blank" rel="noopener" class="stamp-sm px-2 py-1 text-xs font-display uppercase bg-mustard">Kart</a>
      <a :href="streetViewUrl(stop.location)" target="_blank" rel="noopener" class="stamp-sm px-2 py-1 text-xs font-display uppercase bg-forest text-paper">Street View</a>
    </div>
  </article>
</template>
