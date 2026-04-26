# MeshRelief — Offline Mesh Communication

> A serverless, offline-first emergency information relay app. Every phone becomes a local node. No internet. No backend. No infrastructure.

---

## What It Does

MeshRelief lets people share emergency messages — safe routes, medical aid locations, alerts — by physically passing data between devices, even when all internet and cellular infrastructure is down.

Messages are stored locally, expire over time, and hop between devices when people come near each other. Each relay increments a hop counter so the network stays lean and messages don't circulate forever.

---

## How It Works

### Two Relay Modes

**QR Visual Relay (Browser / PWA — works on any device)**
- Device A splits its message cache into rotating QR frames
- Device B scans the frames and reassembles them
- No Wi-Fi, no Bluetooth, no pairing needed — just a camera

**Android Native P2P (Installed Android app)**
- Uses Google Nearby Connections (Bluetooth + Wi-Fi Direct)
- True device-to-device transfer without any infrastructure
- Upgrades automatically when running inside the installed APK

### Multi-Hop Propagation

```
Device A  →  Device B  →  Device C
```

Device B stores whatever it receives from A and can relay it to C. Normal messages relay up to **3 hops**. Urgent emergency alerts relay up to **10 hops**.

### QR Drop (Communal Data Point)

A static QR code representing a device's full message cache. Post it on a wall, a shelter door, or a notice board. Anyone who scans it merges the messages into their own device.

---

## Features

- **Fully offline** — works with no internet once the PWA is installed
- **Multi-hop relay** — A → B → C message propagation
- **Message types** — General Info, Alert, Safe Route, Medical Aid, Direct Message
- **Urgent flag** — higher hop allowance for emergency signals
- **Expiring messages** — auto-prune after 1 hour or 24 hours
- **Storage cap** — max 100 messages to stay lightweight
- **QR Drop** — static communal data bundle, scannable by anyone
- **Privacy controls** — local pseudonym node ID, resettable in Settings, panic wipe
- **PWA** — installable on any device, works offline after first load
- **Android APK** — native shell via Capacitor with Nearby Connections P2P

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, Tailwind CSS |
| Build | Vite 8 |
| Offline / PWA | vite-plugin-pwa, Workbox |
| QR Generation | qrcode.react |
| QR Scanning | @zxing/browser, html5-qrcode |
| Native Shell | Capacitor 8 (Android) |
| Native P2P | @capacitor-trancee/nearby-connections |
| Local Storage | localStorage (no backend) |

---

## Project Structure

```
src/
├── App.jsx              # Main shell and tab routing
├── store.js             # Message storage, sync, merge, expiry logic
├── nativeNearby.js      # Android Nearby Connections integration
└── tabs/
    ├── FeedTab.jsx      # Message feed with filters
    ├── ComposeTab.jsx   # Message creation
    ├── NearbyTab.jsx    # QR relay + native P2P
    ├── QrDropTab.jsx    # Communal QR bundle
    └── SettingsTab.jsx  # Node ID, reset, wipe
```

### Core Store Functions

- `getSyncPayload()` — serializes message cache into a compact transfer bundle
- `parseSyncPayload()` — deserializes a received bundle
- `mergeMessages()` — deduplicates by ID, increments hop count, respects hop limits

---

## Running Locally (Web / PWA)

```bash
npm install --legacy-peer-deps
npm run dev
```

Open `http://localhost:5173` in your browser.

For camera access on mobile browsers, HTTPS is required. Generate a local cert with [mkcert](https://github.com/FiloSottile/mkcert):

```bash
mkcert localhost 127.0.0.1 ::1 <YOUR_LOCAL_IP>
# Rename output files to key.pem and cert.pem in the project root
npm run dev
```

---

## Building the Android App

### Requirements
- Node.js
- Android Studio
- A physical Android device with Developer Options and USB Debugging enabled

### Steps

```bash
npm install --legacy-peer-deps
npm run android:sync   # builds web assets and syncs into Android project
npm run android:open   # opens Android Studio
```

In Android Studio: select your device as the run target and press **Run**.

### Android Permissions Required

The app requests at runtime:
- Bluetooth
- Nearby Devices
- Wi-Fi
- Location (required by Android for Bluetooth scanning)

---

## Live Demo Flow

**Recommended: three devices (Android phones, laptops, or mixed)**

1. Turn off internet / enable airplane mode (keep Bluetooth + Wi-Fi on for Android P2P)
2. On **Device A** — go to `COMPOSE`, create a `Safe Route` or `Medical Aid` message
3. On **Device A** — go to `NEARBY → Broadcast` (QR relay) or tap `Start Native P2P` (Android)
4. On **Device B** — go to `NEARBY → Receive` and scan Device A, or tap `Start Native P2P`
5. Confirm Device B's `FEED` shows the message
6. Repeat from Device B to **Device C**
7. Show the hop count incrementing across C's feed
8. Show `QR DROP` as a static public communication point

---

## Deployment

The web/PWA version is deployed on GitHub Pages:

**[https://t-an-droid.github.io/MeshNet](https://t-an-droid.github.io/MeshNet)**


Once visited, the service worker caches the full app. It loads and runs completely offline on subsequent visits.

To redeploy after changes:

```bash
npm run deploy
```

---

## Known Limitations

- **No iOS native P2P** — iOS requires macOS + Xcode + Apple signing. iPhones can use QR relay mode through the browser.
- **WebRTC not used** — WebRTC requires a signalling server, which breaks the offline-first constraint. QR relay is the browser-safe equivalent.
- **Native P2P is Android-only** — Nearby Connections is a Google API unavailable on browsers or iOS.
- **Append-only messages** — no update or replacement mechanism yet; duplicate IDs are silently dropped.
- **Privacy is pseudonymous, not anonymous** — node ID is included in messages but are local, randomized, and resettable.

---

## License

MIT
