# MūD — Wear OS companion

Standalone Wear OS 3.0 (Galaxy Watch 4+) module that streams real heart-rate
and HRV (RMSSD) data to the MūD phone app over the Wearable Data Layer.

```
wear/
├── build.gradle
└── src/main/
    ├── AndroidManifest.xml
    └── java/com/mud/wear/
        ├── DataLayerPaths.kt     # paths shared with the phone (TS mirror in src/health/)
        ├── DataLayerService.kt   # WearableListenerService — phone → watch
        ├── HeartRateService.kt   # Foreground service — sensors → phone
        └── WearMainActivity.kt   # Compose-for-Wear UI
```

## Architecture

```text
 ┌─────────────────┐    /mud/biometrics    ┌────────────────────┐
 │ HeartRateService│ ────────────────────▶ │  Phone (Android)   │
 │  (foreground)   │    (BPM + RMSSD)      │  ↳ JS bridge       │
 └─────────────────┘                       │  ↳ window event    │
        ▲                                  │  ↳ wearDataReceiver│
        │ /mud/commands                    │  ↳ MonitoringCtx   │
        │ /mud/emotion                     └────────────────────┘
        │
 ┌─────────────────┐
 │ DataLayerService│  ◀── start/stop, DND, ack, emotion-color updates
 └─────────────────┘
```

* **HeartRateService** computes RMSSD every 20 s and re-samples BPM every
  20 min, switching to passive monitoring when the screen is off.
* **DataLayerService** receives commands and emotion updates from the phone
  and rebroadcasts them locally so `WearMainActivity` can re-render and buzz.
* **WearMainActivity** shows the current MūD color/emotion + BPM, and sends a
  distress signal when the user long-presses the crown (`KEYCODE_STEM_*`).

## Data Layer paths

| Path                  | Direction        | Payload                                  |
| --------------------- | ---------------- | ---------------------------------------- |
| `/mud/biometrics`     | watch → phone    | `{ heartRate, hrv, timestamp, activityState }` |
| `/mud/commands`       | phone → watch    | `start` \| `stop` \| `dnd_on` \| `dnd_off` \| `ack_distress` |
| `/mud/emotion`        | phone → watch    | `{ name, color }`                        |
| `/mud/display_mode`   | phone → watch    | `{ mode: 'minimal' \| 'standard' \| 'full' }` |
| `/mud/distress`       | watch → phone    | `{ timestamp, source }`                  |

### Display modes

The phone controls how dense the watch face is via `/mud/display_mode`:

- **minimal** — only the colored bezel ring (max battery, max glanceability).
- **standard** — bezel + central MūD circle + emotion name (default).
- **full** — bezel + emotion + live BPM + HRV (RMSSD) readout.

### Gestures

- **Long-press the crown / stem button (>1s)** → sends `/mud/distress` to the phone.
- **Swipe down on the watch face** → toggles Silent mode locally (bezel dims to 40%, no haptics on emotion change).

The TypeScript mirror of these constants lives at
`src/health/DataLayerPaths.ts`.

## Opening in Android Studio

1. Open the existing MūD Android project in **Android Studio Hedgehog (2023.1)** or newer.
2. From the project root, create/edit `settings.gradle` to include the module:
   ```groovy
   include ':wear'
   ```
3. **File → Sync Project with Gradle Files**. The `:wear` module should appear
   in the Project tree.
4. Add a Wear OS run configuration:
   - **Run → Edit Configurations… → +** → *Android App*
   - **Module:** `wear`
   - **Deploy:** Default APK
   - **Launch:** `com.mud.wear.WearMainActivity`

## Building the APK

From the project root:

```bash
./gradlew :wear:assembleDebug      # debug APK
./gradlew :wear:assembleRelease    # release APK (configure signing in build.gradle)
```

The output APK lands in:

```
wear/build/outputs/apk/debug/wear-debug.apk
```

## Sideloading to a Galaxy Watch 4

The Galaxy Watch 4 runs Wear OS 3.x and accepts standard ADB installs over
Wi-Fi (Samsung does not expose USB on the watch).

1. **On the watch:** *Settings → About watch → Software → tap "Software version" 7×* to enable Developer options.
2. *Settings → Developer options* → enable **ADB debugging** and **Debug over Wi-Fi**.
3. Note the IP shown under **Debug over Wi-Fi** (e.g. `192.168.1.42:5555`).
4. **On your dev machine:**
   ```bash
   adb connect 192.168.1.42:5555
   adb devices                           # confirm "device" status
   adb -s 192.168.1.42:5555 install -r wear/build/outputs/apk/debug/wear-debug.apk
   ```
5. Approve the RSA fingerprint prompt on the watch.
6. Launch **MūD** from the watch's app drawer. Grant **Body sensors**,
   **Body sensors (background)**, and **Physical activity** permissions when prompted.
7. Pair the watch with the MūD phone app (auto-discovered via Google Play
   Services once both apps are installed and signed with matching package
   ids).

### Troubleshooting

| Symptom                                | Fix                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| `adb: device unauthorized`             | Re-tap "Always allow from this computer" on the watch.              |
| BPM stays at `--`                      | Re-grant Body sensors + Physical activity in **Settings → Apps → MūD → Permissions**. |
| Phone shows no biometric updates       | Confirm the phone-side `MudWearBridge` is installed and `wearDataReceiver.isConnected()` returns true. |
| Foreground service killed by Samsung   | Add MūD to **Settings → Battery → Background usage limits → Never sleeping apps**. |

## Notes

- Minimum Wear OS: **3.0 (API 30)**. Galaxy Watch 4 ships with Wear OS 3.0/3.5.
- The Samsung **Health Sensor SDK** is preferred for raw IBI on Galaxy
  watches; `HeartRateService` falls back to `androidx.health.services` BPM
  samples and derives RR intervals when raw IBI isn't available.
- Keep `wear/src/main/java/com/mud/wear/DataLayerPaths.kt` and
  `src/health/DataLayerPaths.ts` in sync — both sides parse the same packet
  shape.
