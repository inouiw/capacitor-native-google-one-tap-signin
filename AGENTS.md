# AGENTS.md

Capacitor plugin for Sign in with Google on web, Android and iOS. Human-oriented docs: [README.md](README.md) (plugin usage) and [demo/react/README.md](demo/react/README.md) (running the demo).

## Layout
- `src/`: TypeScript API and the web implementation (`src/web/`). Unit tests in `src/tests/`.
- `android/`: Android plugin library (module `googleauth-plugin`). Not an app; there is nothing to start here.
- `ios/`: iOS plugin (`ios/Plugin`) and its tests (`ios/PluginTests`).
- `demo/react/`: Ionic React demo app with its own `android/` and `ios/` app projects. It depends on the plugin via `file:../..` (symlink), so it uses the root `dist/` build.

## Build and test (root folder)
- `npm install`, then `npm run build`: build the plugin into `dist/`. Run this after every plugin change, before syncing or starting the demo.
- `npm run buildall`: build the plugin, regenerate the README API section (`docgen`, modifies `README.md`), build the demo and `cap sync` it.
- `npm run test:web`: vitest unit tests.
- `npm run test:android`: needs a booted emulator or a connected device (see below), otherwise fails with `No connected devices!`.
- `npm run test:ios`: needs an iPhone 15 simulator with iOS 18.4 installed.
- `npm run lint`: eslint, prettier and swiftlint.

## Start the demo
Run all demo commands in `demo/react` after building the plugin in the root folder. Run `npm install` there once.

### Web
- `npm start` starts the Vite dev server on http://localhost:3000. It does not exit, so run it in the background. The port must stay 3000, because the web client ID only allows the origins http://localhost:3000 and http://localhost.

### Android
1. Check for a running device: `$ANDROID_HOME/platform-tools/adb devices`.
2. If none, list emulators with `$ANDROID_HOME/emulator/emulator -list-avds`, start one in the background with `$ANDROID_HOME/emulator/emulator -avd <name> -no-snapshot`, and wait until `adb shell getprop sys.boot_completed` prints `1`. (`ANDROID_HOME` defaults to `~/Library/Android/sdk` on macOS.)
3. `npm run build`, then `npx cap run android --target <id>`. Get `<id>` from `npx cap run android --list`. Without `--target`, the command prompts interactively. `cap run` syncs, builds, installs and launches the app.

### iOS
1. List simulators with `xcrun simctl list devices available`, or targets with `npx cap run ios --list`.
2. `npm run build`, then `npx cap run ios --target <id>`. The first sync runs `pod install`.

## Signing in
Signing in needs a real Google account. Do not enter credentials. Ask the user to sign in. The client IDs belong to the plugin author's Google Cloud project: web in `demo/react/src/pages/Page1.tsx`, iOS in `demo/react/ios/App/App/Info.plist`. Android uses the web client ID and additionally needs an Android client ID registered for package `io.ionic.starter` and the SHA-1 of the signing key.
