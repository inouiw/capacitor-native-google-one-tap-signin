# AGENTS.md

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `inouiw/capacitor-native-google-one-tap-signin`, via the `gh` CLI.

### Triage labels

The GitHub default labels are used: `bug`, `enhancement`, `documentation`, `question`, `duplicate`, `invalid`, `wontfix`, `help wanted`, `good first issue`.

## Communication

- Keep responses concise and technical — avoid filler, hedging, and restating what the user already knows.
- When a change can reasonably be implemented in more than one way, ask the user which approach they prefer before writing code.
- Ask clarifying questions whenever requirements, scope, or expected behavior are ambiguous — don't guess silently.
- **A question that offers approaches makes the consequences clear.** For each option, say what choosing it means for the people using the plugin and for the code: API shape, behavior on each platform, migration for existing users, maintenance. The developer must be able to decide from the question alone, without reading the code first.
- **Such a question offers "Explain the trade-offs in more detail" as one of its choices**, so the developer can ask for a deeper explanation instead of having to pick an option or type an answer. On that choice, give the explanation and ask again. The question tool allows four choices, so present at most three approaches per question; with more, ask in two rounds.
- **When the question is one other libraries have faced** — other Capacitor or Cordova sign-in plugins, Google's own Identity SDKs, Firebase Auth — look up how they solved it before asking, and put what you found into the question with links to the sources.

## Repository structure

```
capacitor-native-google-one-tap-signin/
├── src/             # TypeScript API (definitions.ts) and the web implementation (src/web/); unit tests in src/tests/
├── android/         # Android plugin library (module googleauth-plugin) — a library, not an app; nothing to start here
├── ios/             # iOS plugin (ios/Plugin) and its tests (ios/PluginTests)
├── demo/react/      # Ionic React demo app with its own android/ and ios/ app projects
└── .github/workflows/  # CI: javascript-tests, android-tests, ios-tests
```

The demo depends on the plugin via `file:../..` (a symlink), so it always uses the plugin build in the root `dist/`. Rebuild the plugin with `npm run build` in the root after every plugin change.

## Workflow

- **When starting work on an issue, print its full URL** (e.g. `https://github.com/inouiw/capacitor-native-google-one-tap-signin/issues/<number>`) in your first reply, so the user can click through to it — not just `#<number>`.
- **When asked to implement a GitHub issue, always create a separate branch first** (e.g. `issue-<number>-short-description`) and do the work there — never commit the implementation directly to `main`.
- **Avoid stacking when possible — base every PR on `main`. Only genuinely dependent changes need stacking.** (Stacked PRs combined with squash merges force rebases and force-pushes of the child branches; for a dependent sequence, prefer merging each PR before starting the next one on fresh `main`.)
- **Every completed change — not just GitHub issues — ends with a pull request that is then reviewed.** However small the change, once it is done: publish the branch and open a PR (`git push -u` the branch, then `gh pr create`), then run the code review as described below. Reference the issue it implements in the PR description, if any.
- **Make GitHub close the issue automatically when the PR merges:** include a closing keyword followed by the issue number — `Fixes #<issue>`, `Closes #<issue>`, or `Resolves #<issue>` — in **both** the PR description and the commit message. Plain references like "issue #10" or "see #10" do **not** auto-close.
- **Check for merge conflicts with `main` and fix them without being asked.** Before opening a PR, and again whenever you return to an already-open one, run `git fetch origin` and check the branch merges cleanly (`gh pr view <PR#> --json mergeable`, or attempt `git merge origin/main`). On a conflict, resolve it yourself by merging `origin/main` into the branch — adopt the conventions `main` introduced in the meantime, don't just splice the textual halves together. Re-run the affected checks after the merge, then push it.
- **Then review the pull request as a real GitHub code review**, not just a summary comment. Run `/code-review --comment`, which posts each finding as an **inline review comment anchored to the exact file and line** on the PR. Do not post findings only as a plain `gh pr comment` timeline comment. Address any findings before considering the work done.
  - **Keep review feedback concise:** one sentence per finding — state the problem and its impact, no preamble. Only report real issues; no "looks good" filler comments.
  - **Control the depth with the effort level — always at least `medium`.** Default to `/code-review medium --comment`. Use `high` (up to `max`) only when broad coverage matters more than noise. Do not use `low` — it misses too much for reviews that gate merging.
- **A task that needs a browser, a terminal, an emulator or a simulator is still yours to finish: use the user's browser and terminal and do as much of it as you can yourself.** For a step only the user can do — signing in to Google, say, or any other credential prompt — ask them to do that one step, then carry on independently with the rest.
- **After implementing a change, run the demo on every platform the change affects and check that it works without errors.** Exercise the changed flows — watch the browser console, `adb logcat` or the Xcode console, don't just check that the app starts. All demo commands run in `demo/react`, after `npm run build` in the root; run `npm install` there once. Human-oriented steps are in `demo/react/README.md`.
  - **Web:** `npm start` starts the Vite dev server on http://localhost:3000. It does not exit, so run it in the background. The port must stay 3000: the web client ID only allows the origins http://localhost:3000 and http://localhost.
  - **Android:** check for a device with `$ANDROID_HOME/platform-tools/adb devices` (`ANDROID_HOME` defaults to `~/Library/Android/sdk`). If there is none, list emulators with `$ANDROID_HOME/emulator/emulator -list-avds`, start one in the background with `$ANDROID_HOME/emulator/emulator -avd <name> -no-snapshot` and wait until `adb shell getprop sys.boot_completed` prints `1`. Then `npm run build` and `npx cap run android --target <id>`, with `<id>` from `npx cap run android --list` — without `--target` the command prompts interactively.
  - **iOS:** `npm run build`, then `npx cap run ios --target <id>`, with `<id>` from `npx cap run ios --list`. The first sync runs `pod install`.
  - **Google sign-in is tested through the user's Chrome browser (the claude-in-chrome tools)** on web, and in the emulator or simulator on Android and iOS: it needs Google's own pages, which the preview browser does not open, and the user enters their Google credentials themselves — never enter credentials on the user's behalf.
  - The demo's client IDs belong to the plugin author's Google Cloud project: web in `demo/react/src/pages/Page1.tsx`, iOS in `demo/react/ios/App/App/Info.plist`. Android uses the web client ID and additionally needs an Android client ID registered for package `io.ionic.starter` and the SHA-1 of the signing key.
  - **Stop the dev server and any emulator you started when you are done testing**, so ports and devices are free for the next agent session.
  - **If port 3000 is already in use, do not kill the occupying process on your own** — it may belong to another still-running agent session or the user. Ask the user first.

### Coding guidelines

- Prefer immutable variables and pure functions.
- Prefer a result type with a success and an error case over exceptions. Public API methods never throw; they return a result with `isSuccess` (see "Design decisions" in `README.md`).
- Avoid try-catch blocks for branching. Prefer to check whether something exists over handling exceptions.

### Testing

Before considering a task done, run what CI runs at the repo root: `npm run build` and `npm run test:web`, and for native changes `npm run test:android` (needs a booted emulator or connected device, otherwise it fails with `No connected devices!`) and `npm run test:ios` (needs an iPhone 15 simulator with iOS 18.4). `npm run test` runs all of them; `npm run lint` runs eslint, prettier and swiftlint.

### Documentation

`README.md` and `demo/react/README.md` describe the behavior users and agents rely on. Update them **in the same commit** as the code change, and never leave them describing behavior that no longer exists. The "Exposed API" section of `README.md` is a manual copy of the `GoogleOneTapAuthPlugin` interface in `src/definitions.ts`: keep it in sync. Do not amend commits; create a new commit instead.

Releases to npm are done by the maintainer; the steps are not documented yet. Do not bump the version or publish unless the user asks, and then ask them for the steps.
