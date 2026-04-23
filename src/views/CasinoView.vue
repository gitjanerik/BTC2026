<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { guideHome } from '../data/guide.js';
import { loadGoogleMaps, retroMapStyles, homeMarkerIcon } from '../composables/useGoogleMaps.js';

const mapEl = ref(null);
const status = ref('idle');
const errorMsg = ref('');
const casinos = ref([]);

let map;
let markers = [];
let info;

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

async function init() {
  status.value = 'loading';
  try {
    const google = await loadGoogleMaps(['places']);
    const g = google.maps;

    map = new g.Map(mapEl.value, {
      center: guideHome.location,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      styles: retroMapStyles,
    });
    info = new g.InfoWindow();

    const home = new g.Marker({
      position: guideHome.location,
      map,
      icon: homeMarkerIcon(google),
      title: guideHome.name,
      zIndex: 999,
    });
    home.addListener('click', () => {
      info.setContent(`<div style="font-family:Georgia,serif"><strong>🏠 ${guideHome.name}</strong><br>${guideHome.address}</div>`);
      info.open({ map, anchor: home });
    });
    markers.push(home);

    const svc = new g.places.PlacesService(map);
    svc.nearbySearch(
      {
        location: guideHome.location,
        rankBy: g.places.RankBy.DISTANCE,
        type: 'casino',
      },
      (results, statusCode) => {
        if (statusCode !== g.places.PlacesServiceStatus.OK || !results) {
          status.value = 'error';
          errorMsg.value = `Places API svarte: ${statusCode}. Sjekk at Places API er enabled og at nøkkel-restriksjoner tillater den.`;
          return;
        }

        const picked = results.slice(0, 10).map((r) => ({
          id: r.place_id,
          name: r.name,
          address: r.vicinity,
          location: { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() },
          rating: r.rating,
          userRatings: r.user_ratings_total,
          openNow: r.opening_hours?.isOpen?.() ?? r.opening_hours?.open_now,
        }));

        picked.forEach((c, i) => {
          c.distance = distanceMeters(guideHome.location, c.location);
          const m = new g.Marker({
            position: c.location,
            map,
            label: {
              text: String(i + 1),
              color: '#efe4cc',
              fontFamily: 'Russo One',
              fontSize: '12px',
            },
            title: c.name,
          });
          m.addListener('click', () => {
            info.setContent(`
              <div style="font-family:Georgia,serif;max-width:220px">
                <div style="font-weight:700;font-size:14px">${i + 1}. ${c.name}</div>
                <div style="font-size:11px;color:#555;margin-top:2px">${c.address || ''}</div>
                <div style="font-size:11px;margin-top:4px">${c.rating ? '★ ' + c.rating : ''} ${c.userRatings ? '(' + c.userRatings + ')' : ''} · ${fmtDistance(c.distance)}</div>
                <a href="https://www.google.com/maps/search/?api=1&query=${c.location.lat},${c.location.lng}&query_place_id=${c.id}"
                   target="_blank" rel="noopener"
                   style="display:inline-block;margin-top:6px;background:#4a5d3a;color:#efe4cc;padding:4px 8px;text-decoration:none;font-family:sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.05em">Åpne i Maps</a>
              </div>`);
            info.open({ map, anchor: m });
          });
          markers.push(m);
        });

        const bounds = new g.LatLngBounds();
        bounds.extend(guideHome.location);
        picked.forEach((c) => bounds.extend(c.location));
        map.fitBounds(bounds, 40);

        casinos.value = picked;
        status.value = 'ready';
      }
    );
  } catch (e) {
    status.value = 'error';
    errorMsg.value = e.message;
  }
}

function openInMaps(c) {
  const url = `https://www.google.com/maps/search/?api=1&query=${c.location.lat},${c.location.lng}&query_place_id=${c.id}`;
  window.open(url, '_blank', 'noopener');
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
        <span class="ribbon text-[10px]">Spill-direktoratet</span>
      </p>
      <h2 class="stencil text-2xl text-center mt-1">Casino</h2>
      <p class="text-[10px] text-center opacity-70 italic">10 nærmeste fra Tor Martins base</p>
    </div>

    <div class="relative h-[42vh] min-h-[240px] border-b-2 border-ink">
      <div ref="mapEl" class="absolute inset-0" />
      <div v-if="status === 'loading'" class="absolute inset-0 flex items-center justify-center bg-paper/80">
        <p class="font-display uppercase">Søker casinos…</p>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <div v-if="status === 'error'" class="stamp p-3 bg-paper">
        <p class="font-display uppercase text-sovred">Feil</p>
        <p class="text-sm mt-1">{{ errorMsg }}</p>
      </div>

      <p v-if="status === 'ready' && casinos.length === 0" class="text-center text-sm opacity-60">
        Ingen casinos funnet i nærheten.
      </p>

      <ol class="space-y-2">
        <li
          v-for="(c, i) in casinos"
          :key="c.id"
          class="stamp-sm bg-paper p-3 flex gap-3 items-start cursor-pointer"
          @click="openInMaps(c)"
        >
          <div class="stamp-sm bg-sovred text-paper font-display text-lg w-8 h-8 flex items-center justify-center flex-shrink-0">
            {{ i + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-display text-sm leading-tight">{{ c.name }}</p>
            <p v-if="c.address" class="text-xs opacity-70 mt-0.5 truncate">{{ c.address }}</p>
            <div class="flex gap-2 mt-1 text-[11px] opacity-80">
              <span v-if="c.rating">★ {{ c.rating }}<span v-if="c.userRatings" class="opacity-60"> ({{ c.userRatings }})</span></span>
              <span>·</span>
              <span>{{ fmtDistance(c.distance) }}</span>
              <span v-if="c.openNow === true" class="text-forest font-display uppercase">· Åpent</span>
              <span v-else-if="c.openNow === false" class="text-sovred font-display uppercase">· Stengt</span>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>
