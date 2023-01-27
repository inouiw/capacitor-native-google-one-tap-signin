import { CapacitorConfig } from '@capacitor/cli';

/// <reference types="'capacitor-native-google-one-tap-signin'" />

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Google One Tap Signin React Demo',
  webDir: 'build',
  bundledWebRuntime: false,
  plugins: {
    GoogleOneTapAuth: {
      androidClientId: process.env.GOOGLE_ONE_TAB_SIGNIN_DEMO_CLIENT_ID,
    },
  },
};

export default config;
