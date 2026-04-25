<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { program } from '../data/program.js';
import { guideHome } from '../data/guide.js';
import { loadGoogleMaps, mapStylesForTheme, homeMarkerIcon } from '../composables/useGoogleMaps.js';

const el = ref(null);
const status = ref('idle');
const errorMsg = ref('');

const stops = program.flatMap((d) =>
  d.stops.filter((s) => s.location).map((s) => ({ ...s, day: d.label }))
);

let map;
let markers = [];
let info;

async function init() {
  status.value = 'loading';
  try {
    const g = (await loadGoogleMaps()).maps;
    map = new g.Map(el.value, {
      center: guideHome.location,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: true,
      styles: mapStylesForTheme(),
    });
    info = new g.InfoWindow();

    const home = new g.Marker({
      position: guideHome.location,
      map,
      icon: homeMarkerIcon(window.google),
      title: guideHome.name,
      zIndex: 999,
    });
    home.addListener('click', () => {
      info.setContent(`
        <div style="font-family:Georgia,serif;max-width:220px">
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">🏠 ${guideHome.name}</div>
          <div style="font-size:12px;margin-bottom:4px">${guideHome.address}</div>
          <div style="font-size:11px;color:#555">Leil. ${guideHome.apartment}</div>
        </div>`);
      info.open({ map, anchor: home });
    });
    markers.push(home);

    const bounds = new g.LatLngBounds();
    bounds.extend(home.getPosition());
    stops.forEach((s) => {
      const m = new g.Marker({
        position: { lat: s.location.lat, lng: s.location.lng },
        map,
        title: s.title,
      });
      const content = `
        <div style="font-family:Georgia,serif;max-width:220px">
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">${s.title}</div>
          <div style="font-size:11px;color:#555;margin-bottom:4px">${s.day} · ${s.time}</div>
          <div style="font-size:12px;margin-bottom:6px">${s.location.name}</div>
          <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.location.lat},${s.location.lng}"
             target="_blank" rel="noopener"
             style="background:#4a5d3a;color:#efe4cc;padding:4px 8px;text-decoration:none;font-family:sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Street View</a>
        </div>`;
      m.addListener('click', () => { info.setContent(content); info.open({ map, anchor: m }); });
      markers.push(m);
      bounds.extend(m.getPosition());
    });
    if (markers.length > 1) map.fitBounds(bounds, 40);
    status.value = 'ready';
  } catch (e) {
    status.value = 'error';
    errorMsg.value = e.message;
  }
}

onMounted(init);
onUnmounted(() => {
  markers.forEach((m) => m.setMap(null));
  markers = [];
});
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <div class="p-3 border-b-2 border-ink bg-deep">
      <p class="text-center">
        <span class="ribbon text-[10px]">Kartografisk avdeling</span>
      </p>
      <h2 class="stencil text-2xl text-center mt-1">Kart</h2>
    </div>
    <div class="relative flex-1 min-h-0">
      <div ref="el" class="absolute inset-0" />
      <div v-if="status === 'loading'" class="absolute inset-0 flex items-center justify-center bg-paper/80">
        <p class="font-display uppercase">Laster kart…</p>
      </div>
      <div v-if="status === 'error'" class="absolute inset-0 flex items-center justify-center bg-paper p-6">
        <div class="stamp p-4 max-w-sm">
          <p class="font-display uppercase text-sovred">Kart utilgjengelig</p>
          <p class="text-sm mt-2">{{ errorMsg }}</p>
          <p class="text-xs opacity-70 mt-3">Sjekk <code>VITE_GOOGLE_MAPS_API_KEY</code> og at referrer-restriksjoner tillater dette domenet.</p>
        </div>
      </div>
    </div>
  </div>
</template>
