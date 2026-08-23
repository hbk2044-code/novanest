# NovaNest Mobile App (Android / iOS)

Native mobile apps for the NovaNest storefront, built with **Capacitor 8**. The
apps are a thin WebView wrapper around the same web app (`../web/frontend`) and
talk to the NovaNest backend over HTTPS — nothing else is rewritten.

```
mobile/
├── capacitor.config.json   Capacitor config (appId com.novanest.app, appName NovaNest)
├── package.json            Capacitor CLI + platform packages
├── android/                Native Android project (committed, buildable with Gradle)
└── (ios/ created on a Mac with `npx cap add ios`)
```

> The **web app** is a separate project in `../web` — build it first, then sync
> its `dist/` output into the native projects with `npx cap sync`.

---

## Requirements

- **The web app built first**: `cd ../web/frontend && npm install && npm run build`
  (this produces `../web/frontend/dist`, which is what the app loads).
- **Android**: JDK 21 + Android SDK. `ANDROID_HOME` set with `platforms;android-36`
  and `build-tools;36.0.0` installed. (Capacitor 8 requires JDK 21.)
- **iOS**: macOS with Xcode (cannot be built on Linux/Windows).

---

## 1. One-time install

```bash
cd mobile
npm install
```

## 2. Point the app at your backend (before any release!)

Native builds cannot use a same-origin `/api` path. The app currently defaults
to a preview API base (`NATIVE_API_BASE` in `../web/frontend/src/api.js`). For a
real release, build the web app with your production API root:

```bash
cd ../web/frontend
echo "VITE_API_URL=https://yourdomain.com/api" > .env.production
npm run build
```

or edit `NATIVE_API_BASE` at the top of `../web/frontend/src/api.js`, then
rebuild.

## 3. Build the Android app

```bash
cd mobile
npx cap sync android            # copies the latest web dist/ into android/
cd android
export ANDROID_HOME=/opt/android-sdk   # your SDK path
export JAVA_HOME=/path/to/jdk-21       # JDK 21 (Capacitor 8 requires it)
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleDebug

# APK output:
#   android/app/build/outputs/apk/debug/app-debug.apk
```

Or use the npm helper (assumes `ANDROID_HOME`/`JAVA_HOME` are already set):

```bash
cd mobile
npm run build:android
```

To open in Android Studio instead: `npx cap open android` → Run on a device or
emulator.

### Release (Play Store)

```bash
cd mobile/android
./gradlew bundleRelease        # needs signing config in android/app/build.gradle
# AAB output:
#   android/app/build/outputs/bundle/release/app-release.aab
```

The debug APK is unsigned — for Play Store you must create a keystore
(`keytool -genkey ...`) and add signing config. The current debug APK is for
testing only.

## 4. Build the iOS app (macOS + Xcode required)

```bash
cd mobile
npm install
npx cap add ios                # one-time only
npx cap sync ios
npx cap open ios               # Xcode: set your Team, bundle id, then Run
```

For App Store distribution use **Xcode → Archive → Distribute App**.

---

## How it works

- `capacitor.config.json` → `webDir: "../web/frontend/dist"` — `npx cap sync`
  copies the freshly built web app into each native project.
- `android/` is committed so builds are reproducible; generated build artifacts
  and the copied web assets under `android/app/src/main/assets/public/` are
  git-ignored and refreshed by every `npx cap sync`.
- Payments (eSewa/Khalti) are handled entirely by the backend; no payment SDK is
  bundled in the app.
- The admin panel is browser-only — log in at your domain `/admin`.

## Troubleshooting

- **Blank screen after `cap sync`**: you forgot to rebuild the web app first —
  run `cd ../web/frontend && npm run build`, then `npx cap sync` again.
- **`invalid source release: 21`**: wrong JDK. Capacitor 8 needs JDK 21
  (`JAVA_HOME` must point at it), not JDK 17.
- **App calls the wrong server**: the build used the wrong `VITE_API_URL`.
  Rebuild the web app with the correct value and `npx cap sync` again.
