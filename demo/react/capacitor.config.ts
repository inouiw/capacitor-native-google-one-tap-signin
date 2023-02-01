import { CapacitorConfig } from '@capacitor/cli';

/// <reference types="'capacitor-native-google-one-tap-signin'" />

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Google One Tap Signin React Demo',
  webDir: 'build',
  bundledWebRuntime: false,
  plugins: {
    GoogleOneTapAuth: {
      androidClientId: '333448133894-oo2gapskrr4j7p7gg5kn6b0sims22mcu.apps.googleusercontent.com',
    },
  },
};

export default config;
