# Getting started

Install dependencies and build the plugin and then the demo app with
`npm install`
`npm run build`

Then open and edit the plugin and demo app in Android Stuido. `ionic capacitor open android`

The demo app reads the client id from the following places:
 - android: from the environment variable `GOOGLE_ONE_TAB_SIGNIN_DEMO_CLIENT_ID`. See `capacitor.config.ts`.
 - ios: from `GIDClientID` in `Info.plist`.
 - web: from variable `clientId` in `Page1.tsx`.
