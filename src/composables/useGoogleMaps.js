const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let loadPromise = null;
let loadedLibs = new Set();

export function loadGoogleMaps(libraries = []) {
  if (!key) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY mangler'));

  const missing = libraries.filter((l) => !loadedLibs.has(l));

  if (window.google && window.google.maps && missing.length === 0) {
    return Promise.resolve(window.google);
  }

  if (loadPromise && missing.length === 0) return loadPromise;

  const allLibs = new Set([...loadedLibs, ...libraries]);
  const libsParam = [...allLibs].join(',');

  loadPromise = new Promise((resolve, reject) => {
    const old = document.querySelector('script[data-gmaps]');
    if (old) old.remove();
    const s = document.createElement('script');
    const libs = libsParam ? `&libraries=${libsParam}` : '';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly${libs}`;
    s.async = true;
    s.defer = true;
    s.dataset.gmaps = '1';
    s.onload = () => {
      loadedLibs = allLibs;
      resolve(window.google);
    };
    s.onerror = () => reject(new Error('Kunne ikke laste Google Maps'));
    document.head.appendChild(s);
  });

  return loadPromise;
}

export const retroMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#efe4cc' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#2a1810' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#efe4cc' }] },
  { featureType: 'water', stylers: [{ color: '#c9a24a' }] },
  { featureType: 'road', stylers: [{ color: '#e0cfa8' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
];

const HOUSE_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='48' viewBox='0 0 40 48'>
    <path d='M20 2 L2 20 L8 20 L8 44 L32 44 L32 20 L38 20 Z' fill='#d9601f' stroke='#2a1810' stroke-width='2.5' stroke-linejoin='round'/>
    <rect x='16' y='28' width='8' height='12' fill='#2a1810'/>
    <rect x='12' y='22' width='4' height='4' fill='#efe4cc' stroke='#2a1810' stroke-width='1'/>
    <rect x='24' y='22' width='4' height='4' fill='#efe4cc' stroke='#2a1810' stroke-width='1'/>
  </svg>`
);

export function homeMarkerIcon(g) {
  return {
    url: `data:image/svg+xml;utf-8,${HOUSE_SVG}`,
    scaledSize: new g.maps.Size(40, 48),
    anchor: new g.maps.Point(20, 44),
  };
}
