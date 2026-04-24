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

export const retroDarkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1510' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c9a24a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0c08' }] },
  { featureType: 'water', stylers: [{ color: '#3a2a14' }] },
  { featureType: 'road', stylers: [{ color: '#2a1f15' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#d4b466' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#c9a24a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#4a3d2a' }] },
  { featureType: 'landscape', stylers: [{ color: '#1f1a13' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#b48a4a' }] },
];

export function mapStylesForTheme() {
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return dark ? retroDarkMapStyles : retroMapStyles;
}

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

const BEER_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='34' height='42' viewBox='0 0 34 42'>
    <path d='M6 10 L22 10 L21 36 Q21 39 18 39 L10 39 Q7 39 7 36 Z'
          fill='#f1c43a' stroke='#2a1810' stroke-width='2' stroke-linejoin='round'/>
    <path d='M8 10 Q10 6 13 8 Q15 5 18 7 Q21 6 21 10' fill='#efe4cc' stroke='#2a1810' stroke-width='1.4'/>
    <path d='M22 14 L28 14 Q30 14 30 17 L30 25 Q30 28 28 28 L22 28'
          fill='none' stroke='#2a1810' stroke-width='2' stroke-linejoin='round'/>
    <line x1='11' y1='16' x2='11' y2='34' stroke='#2a1810' stroke-width='1' opacity='0.4'/>
    <line x1='17' y1='16' x2='17' y2='34' stroke='#2a1810' stroke-width='1' opacity='0.4'/>
  </svg>`
);

export function beerMarkerIcon(g) {
  return {
    url: `data:image/svg+xml;utf-8,${BEER_SVG}`,
    scaledSize: new g.maps.Size(34, 42),
    anchor: new g.maps.Point(17, 38),
  };
}
