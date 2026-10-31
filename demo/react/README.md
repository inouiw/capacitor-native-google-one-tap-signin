# Demo app

A React (Ionic) app that exercises every plugin method on web, Android and iOS.

The demo depends on the plugin via `file:../..`, so it always uses the plugin build in the repository root (`dist/`). Rebuild the plugin after changing plugin code.

## Prerequisites
- Node.js 20 or newer
- Android: Android Studio and an emulator with Google Play services, API level 24 or higher (or a device)
- iOS: Xcode and CocoaPods

## Build everything at once
```bash
# In the root folder
npm install
npm run buildall
```
`buildall` builds the plugin (including the API docs in `dist/docs.json`), builds the demo app and syncs it to the Android and iOS projects. Afterwards continue with the "Run" step of your target below.

## Web
```bash
# In the root folder: build the plugin
npm install
npm run build

# In the demo/react folder
npm install
npm start
```
Open http://localhost:3000. The port must be 3000, because that origin is allowed for the web client ID.

## Android
```bash
# In the root folder: build the plugin
npm install
npm run build

# In the demo/react folder: build the web app
npm install
npm run build

# Copy the web app into the Android project, then build and run it on an emulator or device (you are asked to pick one)
npx cap run android
```
To edit and debug the plugin and the demo app together in Android Studio, run `npx cap sync --inline android` and `npx cap open android` instead of `npx cap run android`, then press Run. `--inline` adds inline source maps, so you can debug the TypeScript code in the WebView.

## iOS
```bash
# In the root folder: build the plugin
npm install
npm run build

# In the demo/react folder: build the web app
npm install
npm run build

# Copy the web app into the iOS project (also runs pod install), then build and run it on a simulator or device (you are asked to pick one)
npx cap run ios
```
To edit and debug the plugin and the demo app together in Xcode, run `npx cap sync --inline ios` and `npx cap open ios` instead of `npx cap run ios`, then press Run.

## After changing code
- Plugin code (`src/`, `android/`, `ios/` in the root folder): run `npm run build` in the root folder, then repeat the steps of your target.
- Demo web code (`demo/react/src`): the web dev server reloads automatically. For Android and iOS, run `npm run build` and `npx cap run <platform>` again (or `npx cap sync --inline <platform>` when you run from Android Studio or Xcode).

## Client IDs
The demo uses client IDs of a Google Cloud project of the plugin author:
- Web: `clientId` in `src/pages/Page1.tsx`. Allowed origins: http://localhost:3000, http://localhost.
- Android: uses the same web client ID (passed to `initialize`). Sign-in only works if an Android client ID with package name `io.ionic.starter` and the SHA-1 fingerprint of your signing key is registered in the same Google Cloud project. If it is missing, the error message contains the package name and SHA-1 to register.
- iOS: `GIDClientID` and the URL scheme in `ios/App/App/Info.plist`. `GIDServerClientID` there is the web client ID, so that the ID token is issued for it, as on web and Android.

To use your own Google Cloud project, replace these values. See "Configure" in the [root README](../../README.md#3-configure).

## Troubleshooting
- Chrome may block the sign-in prompt on localhost after repeated tests (*Third-party sign in was disabled in browser Site Settings*). Re-enable it under `chrome://settings/content/federatedIdentityApi`.
- `No connected devices!` from `npm run test:android` or `npx cap run android`: start an emulator first (Android Studio Device Manager, or `$ANDROID_HOME/emulator/emulator -avd <name>`; on macOS `ANDROID_HOME` is usually `~/Library/Android/sdk`).
