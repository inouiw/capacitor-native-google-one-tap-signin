/// <reference types="@capacitor/cli" />

declare module '@capacitor/cli' {
  export interface PluginsConfig {
    GoogleOneTapAuth: GoogleOneTapAuthPluginOptions;
  }
}

export interface User {
  id: string;
  idToken: string;
  displayName: string;
  givenName: string;
  familyName: string;
  profilePictureUri: string;
}

export interface GoogleOneTapAuthPluginOptions {
  /**
   * Web application client ID key for android platform
   */
  androidClientId?: string;

  /**
   * Web application client ID key for web platform
   */
  webClientId?: string;
}

export interface GoogleOneTapAuthPlugin {
  signIn(): Promise<User>;
  signOut(): Promise<any>;
}

export interface WebInitOptions extends Pick<GoogleOneTapAuthPluginOptions, 'webClientId'> {
}