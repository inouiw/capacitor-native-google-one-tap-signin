# Getting started

Install dependencies and build the plugin and then the demo app with
```bash
# In the root folder
npm install
npm run build

# In the /demo/react folder
npm install
```

## Configuration
The demo app reads the client id from the following places:
 - android: from the environment variable `GOOGLE_ONE_TAB_SIGNIN_DEMO_CLIENT_ID`. See `capacitor.config.ts`.
 - ios: from `GIDClientID` in `Info.plist`.
 - web: from variable `clientId` in `Page1.tsx`.

## Start the web app
```bash
npm start
```
The pre-configured client-id should has the following origins allowed: http://localhost:3000, http://localhost
Some features as `navigator.credentials.get` require a secure context but also work on localhost.

## Run on android
Then open and edit the plugin and demo app in Android Stuido. 
```bash
npx cap sync --inline android
npx cap open android
```

## Run on ios
Then open and edit the plugin and demo app in XCode. 
```bash
npx cap sync --inline ios
npx cap open ios
```