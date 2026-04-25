# MeshRelief Run Instructions

## 1. Laptop Browser Mode

Use this for Windows, macOS, or Linux laptops. This runs the web/PWA version with QR relay support.

### Setup Proper Local HTTPS (Required for Camera APIs)

To avoid "Not Secure" warnings and enable camera access on mobile browsers, use `mkcert`:

1.  **Install mkcert:**
    *   macOS: `brew install mkcert`
    *   Windows: `choco install mkcert`
2.  **Setup local CA:** `mkcert -install`
3.  **Generate certificates:** `mkcert localhost 127.0.0.1 ::1 <YOUR_LAPTOP_IP>` (Replace `<YOUR_LAPTOP_IP>` with your actual local IP).
4.  **Rename files:** Rename the generated files to `key.pem` and `cert.pem` in the project root.

### Start The App

```bash
npm install
npm run dev
```

The app will now serve over valid HTTPS. Open the local URL shown by Vite, usually:

```text
https://localhost:5173
```

### Laptop Demo Flow

1. Open the app on Laptop A.
2. Create a message in `COMPOSE`.
3. Open `NEARBY` on Laptop A and keep it on `Broadcast`.
4. Open the app on Laptop B.
5. Go to `NEARBY > Receive`.
6. Scan Laptop A's rotating QR frames.
7. Laptop B imports the message.

This demonstrates local peer relay using visual QR transfer.

## 2. Android Native App Mode

Use this for the native Android app with Nearby Connections P2P.

### Requirements

- Android Studio installed
- Android phone
- USB cable
- Developer Options enabled on the phone
- USB Debugging enabled on the phone

### Build And Open Android Project

```bash
npm install
npm run android:sync
npm run android:open
```

Android Studio will open the native project.

### Install On Phone

1. Connect the Android phone by USB.
2. Accept the USB debugging prompt on the phone.
3. In Android Studio, select the phone as the run target.
4. Press the green `Run` button.
5. Android Studio installs MeshRelief on the phone.

### Android Native P2P Demo Flow

Use at least two Android phones with the installed app.

1. Open MeshRelief on Phone A and Phone B.
2. On both phones, go to `NEARBY`.
3. Tap `Start Native P2P`.
4. Grant Bluetooth, nearby devices, Wi-Fi, and location permissions if prompted.
5. Wait for the phones to discover each other.
6. Create a message on Phone A.
7. Use `Start Native P2P` again or keep both phones active so the message cache is exchanged.
8. Confirm Phone B receives the message in `FEED`.

For multi-hop:

1. Phone A sends to Phone B.
2. Move Phone B near Phone C.
3. Start Native P2P on Phone B and Phone C.
4. Phone C receives the relayed message.

This demonstrates `Device A -> Device B -> Device C`.

## 3. Mixed Device Demo

Use this when you have Android phones plus laptops or iPhones.

### Recommended Flow

1. Android phones use `NEARBY > Start Native P2P`.
2. Laptops and iPhones use `NEARBY` QR relay or `QR DROP`.
3. To bridge native and browser devices:
   - Receive a message on Android.
   - Open `NEARBY > Broadcast` on Android.
   - Scan from laptop/iPhone using `NEARBY > Receive` or `QR DROP`.

This keeps the demo reliable even when not all devices support native Android Nearby Connections.

## 4. QR Drop Mode

Use `QR DROP` as a communal data point, like a public notice board.

1. Device A opens `QR DROP`.
2. Device B scans the QR code from `QR DROP`.
3. Device B imports the message bundle.
4. Device B can later show its own updated QR Drop somewhere else.

Use this in the presentation as the physical-location storage point.

## 5. Troubleshooting

### PowerShell Blocks npm

If `npm` is blocked on Windows PowerShell, use:

```bash
npm.cmd run dev
npm.cmd run build
```

### Android Build Says JAVA_HOME Is Invalid

Set `JAVA_HOME` to an installed JDK folder, not the installer `.exe`.

Example:

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-21"
```

Then retry:

```bash
npm run android:sync
npm run android:open
```

### Native P2P Does Not Discover Peers

Check:

- Both phones have Bluetooth enabled.
- Both phones have Wi-Fi enabled.
- Nearby Devices permission is granted.
- Location permission is granted.
- Both phones are on the `NEARBY` tab with Native P2P active.
- Battery saver is disabled during demo.

### iOS Devices

iPhones can use the browser/PWA QR relay mode.

Native iOS builds require:

- macOS
- Xcode
- Apple signing setup
- iOS Capacitor platform

For this hackathon demo, use Android for native P2P and iOS through QR relay.
