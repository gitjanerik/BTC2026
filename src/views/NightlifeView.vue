<script setup>
import { nightlife } from '../data/nightlife.js';

function mapsUrl(loc) {
  return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
}
function streetViewUrl(loc) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${loc.lat},${loc.lng}`;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 space-y-5">
    <div class="text-center">
      <span class="ribbon text-[10px]">Guidens hemmelige liste</span>
      <h2 class="stencil text-3xl mt-2">Nattliv</h2>
      <p class="text-xs opacity-70 italic">Tor Martins kurerte kveldssteder — små, absurde, undergrunn.</p>
    </div>

    <section v-for="g in nightlife" :key="g.group" class="space-y-2">
      <h3 class="font-display text-lg uppercase flex items-center gap-2">
        <span>{{ g.emoji }}</span>
        <span>{{ g.group }}</span>
      </h3>
      <ul class="space-y-2">
        <li v-for="v in g.venues" :key="v.name" class="stamp-sm bg-paper p-3">
          <p class="font-display text-base leading-tight">{{ v.name }}</p>
          <p class="text-sm leading-snug mt-1">{{ v.desc }}</p>
          <div v-if="v.location" class="flex gap-2 pt-2">
            <a :href="mapsUrl(v.location)" target="_blank" rel="noopener" class="stamp-sm px-2 py-1 text-xs font-display uppercase bg-mustard">Kart</a>
            <a :href="streetViewUrl(v.location)" target="_blank" rel="noopener" class="stamp-sm px-2 py-1 text-xs font-display uppercase bg-forest text-paper">Street View</a>
          </div>
          <p v-else class="text-[10px] opacity-50 italic pt-1">Ingen fast adresse — spør Tor Martin</p>
        </li>
      </ul>
    </section>
  </div>
</template>
