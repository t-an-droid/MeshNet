# MeshRelief Project Handoff

## Current Project Status

MeshRelief is an offline-first emergency information relay app built for the Offline Mesh Communication hackathon problem statement.

The app currently supports:

- Local message creation and storage
- Local news / alert feed
- Expiring messages
- Urgent emergency alerts
- Direct-message style scoped messages by node ID
- QR-based communal data drops
- Nearby visual relay through rotating low-density QR frames
- Android Capacitor native shell
- Android Native P2P integration scaffold using Nearby Connections
- Multi-hop propagation through message merge and hop counts
- Browser/PWA fallback for laptops, iPhones, and non-native devices

The safest live demo path is:

```text
Device A creates message
Device B receives via Nearby QR relay or Android Native P2P
Device C receives from Device B
```

This satisfies the required `Device A -> Device B -> Device C` propagation story.

## Hackathon Requirement Mapping

### Functions With Zero Internet Connectivity

Implemented.

How:

- Messages are stored in `localStorage`.
- QR relay and QR Drop work fully offline.
- The app can run as a PWA once loaded/installed.
- Android Capacitor app packages the web assets locally inside the app.

Relevant files:

- `src/store.js`
- `src/tabs/QrDropTab.jsx`
- `src/tabs/NearbyTab.jsx`
- `capacitor.config.json`
- `android/`

### Peer-To-Peer Local Communication

Partially implemented, with two paths.

Implemented browser-safe path:

- `Nearby` uses rotating QR frames for close-range person-to-person transfer.
- This is not radio P2P, but it is local device-to-device exchange with no infrastructure.

Implemented native path:

- Android Capacitor project added.
- `@capacitor-trancee/nearby-connections` installed.
- `src/nativeNearby.js` implements native discovery, connection acceptance, payload sending, and payload receiving.
- `NearbyTab` exposes a `Start Native P2P` button when running inside the installed Android app.

Needs real-device testing:

- Native P2P has been coded and synced into Android, but it has not yet been verified on two physical Android phones.

Relevant files:

- `src/nativeNearby.js`
- `src/tabs/NearbyTab.jsx`
- `android/app/src/main/AndroidManifest.xml`

### QR-Based Communal Data Drops

Implemented.

How:

- `QR DROP` creates a static QR bundle from the local message cache.
- Other devices can scan it and merge new messages.
- This models walls, notice boards, shelters, and public communication points.

Relevant file:

- `src/tabs/QrDropTab.jsx`

### Multi-Device Information Exchange

Implemented.

How:

- Messages are serialized into compact arrays.
- Receiving devices parse and merge messages.
- Duplicate messages are ignored by ID.
- Hop count increments on relay.

Relevant file:

- `src/store.js`

Core functions:

- `getSyncPayload()`
- `parseSyncPayload()`
- `mergeMessages()`

### Multi-Hop Propagation: Device A -> B -> C

Implemented.

How:

- Device A creates a message.
- Device B imports it via Nearby or QR Drop.
- Device B now stores the message locally.
- Device C imports from Device B.
- The message hop count increments each time.

Limits:

- Normal messages relay up to 3 hops.
- Urgent messages relay up to 10 hops.

Relevant file:

- `src/store.js`

### Local News Sharing

Implemented.

How:

- `COMPOSE` lets users create general broadcasts, alerts, safe route notes, medical aid notes, and direct messages.
- `FEED` displays locally stored messages with filters.

Relevant files:

- `src/tabs/ComposeTab.jsx`
- `src/tabs/FeedTab.jsx`

### Emergency Alerts And Safe Routes

Implemented.

How:

- Compose supports:
  - `Alert`
  - `Safe Route`
  - `Medical Aid`
  - `General Info`
  - `Direct Message`
- Emergency Signal marks a message as urgent.
- Urgent messages receive higher hop allowance.

Relevant files:

- `src/tabs/ComposeTab.jsx`
- `src/store.js`

### Privacy Protections / No Persistent Identity Requirement

Partially implemented.

How:

- Each device has a local node ID generated on first use.
- The user can reset the session ID in Settings.
- Messages are stored locally only.
- No backend or global account exists.

Limitations:

- The generated node ID persists in `localStorage` until reset.
- Sender name and sender ID are included in message records.
- This is acceptable for a prototype, but the privacy story should mention that identities are local, resettable pseudonyms.

Relevant files:

- `src/store.js`
- `src/tabs/SettingsTab.jsx`

### Expiry / Time-Awareness

Implemented.

How:

- Messages can expire after 1 hour or 24 hours.
- Expired messages are pruned from storage.
- Feed shows expiry badges.

Relevant files:

- `src/store.js`
- `src/tabs/ComposeTab.jsx`
- `src/tabs/FeedTab.jsx`

### Limited Storage

Implemented.

How:

- Local message cache is capped at 100 records.
- QR payloads use character budgets to avoid oversized codes.

Relevant file:

- `src/store.js`

### Low Bandwidth / Data Efficiency

Implemented.

How:

- Messages are serialized as compact arrays instead of verbose objects.
- QR Drop uses a conservative payload budget.
- Nearby visual relay splits larger payloads into small frames.

Relevant files:

- `src/store.js`
- `src/tabs/NearbyTab.jsx`
- `src/tabs/QrDropTab.jsx`

## Current Architecture

### Data Model

Messages are stored in browser `localStorage`.

Each message contains:

- `id`
- `text`
- `type`
- `isUrgent`
- `expiresAt`
- `recipientId`
- `timestamp`
- `senderId`
- `senderName`
- `hops`

Storage and sync logic lives in:

```text
src/store.js
```

### Main App Shell

Main app state and tab routing lives in:

```text
src/App.jsx
```

Tabs:

- `FEED`
- `COMPOSE`
- `NEARBY`
- `QR DROP`
- `SETTINGS`

### Nearby Tab

Nearby has two modes:

1. Native P2P panel
2. QR relay fallback

Native P2P:

- Only active inside installed Capacitor Android app.
- Uses Android Nearby Connections plugin.
- Starts advertising and discovery.
- Accepts incoming connections automatically.
- Sends current message cache after connecting.

QR relay:

- Splits message payload into small chunks.
- Shows one QR frame at a time.
- Receiver scans frames and reassembles them.

Relevant files:

```text
src/tabs/NearbyTab.jsx
src/nativeNearby.js
```

### QR Drop

QR Drop is a static communal bundle.

Relevant file:

```text
src/tabs/QrDropTab.jsx
```

### Capacitor Android

Capacitor config:

```text
capacitor.config.json
```

Android project:

```text
android/
```

Android permissions:

```text
android/app/src/main/AndroidManifest.xml
```

Installed native plugin:

```text
@capacitor-trancee/nearby-connections
```

## How To Run

See:

```text
RUN_INSTRUCTIONS.md
```

Quick web run:

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Quick Android sync/open:

```bash
npm run android:sync
npm run android:open
```

## Verification Already Done

The following passed:

```bash
npm run build
npx cap sync android
npm run lint
npx cap ls
```

`npx cap ls` detected:

```text
@capacitor-trancee/nearby-connections
```

Android native Gradle compile was attempted, but not completed. Details below.

## Known Issues / Remaining Work

### 1. Android Native Build Needs Local Environment Fix

Status:

- Capacitor Android project exists.
- Web assets synced.
- Plugin detected.
- Native Gradle compile did not complete in this environment.

What happened:

- `JAVA_HOME` was initially pointing to:

```text
C:\Users\yashi\Downloads\jdk-21_windows-x64_bin.exe
```

- That is an installer file, not a JDK folder.
- Retried with:

```text
C:\Program Files\Java\jdk-21
```

- Gradle stayed busy for 5+ minutes and was stopped cleanly.

What teammates should do:

1. Open Android Studio.
2. Open the `android/` folder.
3. Let Gradle sync finish.
4. Build/run on a real Android phone.
5. If needed, set `JAVA_HOME` to the installed JDK directory.

### 2. Native P2P Needs Real Phone Testing

Status:

- Code exists.
- Permissions exist.
- Plugin config exists.
- Not yet verified on two Android devices.

Test plan:

1. Install app on two Android phones.
2. Open `NEARBY`.
3. Tap `Start Native P2P` on both.
4. Grant permissions.
5. Confirm peer count increases.
6. Create message on Phone A.
7. Confirm Phone B receives it.
8. Relay from Phone B to Phone C.

Possible corrections if it does not work:

- Check plugin event payload names.
- Check whether `Strategy.CLUSTER` works best, or switch to `Strategy.POINT_TO_POINT` for a simpler two-phone demo.
- Check whether payload must be base64 encoded. Current code sends base64 JSON, matching plugin docs.
- Confirm Android permissions are granted at runtime.

### 3. iOS Native P2P Is Not Implemented

Status:

- iOS Capacitor platform was not added.
- Native iOS P2P has not been built.

Reason:

- This workspace is Windows.
- iOS builds require macOS, Xcode, Apple signing, and real iPhones.

Recommendation:

- Use Android for native P2P.
- Use iPhones through QR relay / QR Drop.

### 4. Privacy Could Be Stronger

Current behavior:

- Node ID and alias are included in messages.
- Identity persists until reset.

Possible improvement:

- Add a "privacy mode" that omits sender name.
- Rotate node ID automatically every session.
- Add "panic wipe" button more prominently.

### 5. Message Replacement / Updates Not Implemented

Requirement mentions replacement/update mechanisms.

Current behavior:

- Messages are append-only.
- Duplicate IDs are ignored.

Possible improvement:

- Add `replacesId` or `threadId`.
- Allow newer messages with same logical topic to replace older records.

### 6. QR Drop Payload Is Conservative

Current behavior:

- `getSyncPayload()` defaults to 600 characters.
- This improves scan reliability but may include fewer messages.

Possible improvement:

- Add a QR Drop "compact / full" toggle.
- Use rotating frames for QR Drop too.

## Recommended Demo Script

### Demo Setup

Prepare three devices:

- Device A
- Device B
- Device C

Best setup:

- Android phones if native P2P works.
- Otherwise laptops/phones using QR relay.

### Demo Steps

1. Turn off internet or use airplane mode with Wi-Fi/Bluetooth as needed.
2. On Device A, create a `Safe Route` or `Medical Aid` message.
3. On Device B, receive from Device A using:
   - Android `Start Native P2P`, or
   - `NEARBY > Receive` QR relay.
4. Show Device B feed contains the message.
5. On Device C, receive from Device B.
6. Show Device C feed contains the same message with increased hop count.
7. Show `QR DROP` as a static public communication point.
8. Show Settings reset/wipe as resilience/privacy controls.

### Presentation Framing

Use this language:

```text
MeshRelief treats every phone as a temporary local node. Messages are stored locally,
expire over time, and are relayed when people physically come near each other.
For browser and mixed-device reliability, we use QR-based visual relay. In the Android
native app, Nearby Connections upgrades the same sync protocol to real device-to-device
peer transfer without a backend or internet.
```

## Files Teammates Should Read First

Start here:

```text
RUN_INSTRUCTIONS.md
PROJECT_HANDOFF.md
src/store.js
src/tabs/NearbyTab.jsx
src/nativeNearby.js
src/tabs/QrDropTab.jsx
src/tabs/ComposeTab.jsx
src/tabs/FeedTab.jsx
```

Android-specific:

```text
capacitor.config.json
android/app/src/main/AndroidManifest.xml
package.json
```

## Most Important Next Tasks

1. Test Android native P2P on two real Android phones.
2. If Native P2P fails, use QR relay for the live demo and present Android P2P as the native upgrade path.
3. Make sure all demo devices already have the app open/installed before judging.
4. Prepare three sample messages:
   - Safe route
   - Medical aid
   - Emergency alert
5. Practice the exact A -> B -> C flow twice before the live demo.

## Honest Trade-Offs To Mention To Judges

- Web browsers do not expose reliable Wi-Fi Direct APIs.
- WebRTC requires signalling, which usually means a server.
- To stay serverless and offline, the browser version uses QR relay.
- Android native mode uses Nearby Connections for true local P2P.
- QR Drop models persistent public communication points.
- Local-only storage and expiring messages limit compromise if a device is seized.

This framing is technically honest and matches the hackathon constraints.
