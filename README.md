# BTC-gutta 2026

Reisefølge-app for Bucuresti 24.–27. april 2026. Vue 3 + Vite + Tailwind + Firebase + PWA.

## Kjøre lokalt

```bash
npm install
cp .env.local.example .env.local  # fyll inn verdier
npm run dev
```

## Bygg og preview

```bash
npm run build
npm run preview
```

## Miljøvariabler (`.env.local`)

| Variabel | Forklaring |
|---|---|
| `VITE_FIREBASE_*` | Firebase-config (offentlig per design — sikres i rules) |
| `VITE_GOOGLE_MAPS_API_KEY` | Maps JavaScript API. Restrict til HTTP referrer |
| `VITE_APP_PIN_GUEST` | PIN for Øystein/Øyvind/Frode/Jan |
| `VITE_APP_PIN_GUIDE` | Tor Martins egen PIN |

Appen fungerer uten Firebase-config — Program, Kart, Fraser og Valuta virker offline. Chat, Bingo og Broadcast krever Firebase.

## Features

- **Program** — 4 dager med stops, Google Maps- og Street View-lenker
- **Kart** — alle stops som markører (Google Maps JS API)
- **Chat** — Firestore sanntid
- **Bingo** — 16 items, foto-upload til Firebase Storage, ledertavle
- **Fraser** — norsk→rumensk, Web Speech TTS (fallback til fonetikk hvis ingen ro-RO-stemme)
- **Valuta** — RON↔NOK via open.er-api.com, 12t localStorage-cache
- **Guide broadcast** — kun Tor Martin, push-varsel via Notifications API (krever PWA installert på iOS), med in-app toast + lyd som backup

## Auth

- Navn velges fra hardkodet liste, PIN godkjennes klientside
- Deretter Firebase anonymous sign-in → egen UID
- `localStorage` holder sesjon

## Firestore

Struktur:
```
/chat/{id}                        { text, senderName, senderId, createdAt }
/bingo/{uid}/items/{itemId}       { photoUrl, completedAt, byName }
/broadcasts/{id}                  { text, senderId, senderName, createdAt }
```

Regler i `firestore.rules`. For sikker broadcast må Tor Martins UID få `isGuide: true` som custom claim via Firebase Admin SDK. For MVP kan man la klientsjekken stå — lukket app for 5 personer.

## Deploy

GitHub Pages. Push til `main` trigger `.github/workflows/deploy.yml`. Legg miljøvariablene inn som repo secrets (samme navn som `VITE_*`).

Enable Pages i repo-innstillinger: Source = "GitHub Actions".

## PWA-ikoner

`public/icons/` har plassholdere — bytt ut med egne design (192, 512, maskable 512 PNG).

## Gotchas

- **iOS notifications**: krever "Add to Home Screen" først. Tab-basert Safari støtter ikke.
- **Service worker scope**: matcher `/BTC2026/` (`vite.config.js` → `base`).
- **Maps nøkkel**: restrict til `https://<user>.github.io/BTC2026/*` + `http://localhost:*`.
- **Rumensk TTS-stemme** finnes ikke på alle enheter — app viser fonetikk uansett.
