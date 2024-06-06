# Getting started

Install dependencies and build the plugin and then the demo app with
`npm install`
`npm run build`

## Configureation
The demo app reads the client id from the following places:
 - android: from the environment variable `GOOGLE_ONE_TAB_SIGNIN_DEMO_CLIENT_ID`. See `capacitor.config.ts`.
 - ios: from `GIDClientID` in `Info.plist`.
 - web: from variable `clientId` in `Page1.tsx`.

## Start the web app
`npm start`
The pre-configured client-id should has the following origins allowed: http://localhost:3000, http://localhost
Some features as `navigator.credentials.get` require a secure context but also work on localhost.

## Run on android
Then open and edit the plugin and demo app in Android Stuido. `npx cap open android`

## Run on ios
Then open and edit the plugin and demo app in XCode. `npx cap open ios`