/// <reference types="@capacitor/cli" />

declare module '@capacitor/cli' {
  export interface PluginsConfig {
    GoogleOneTapAuth: GoogleOneTapAuthPluginOptions;
  }
}

// export interface User {
//   id: string;
//   idToken: string;
//   displayName: string;
//   givenName: string;
//   familyName: string;
//   profilePictureUri: string;
// }

/**
 * Options that can be defined in capacitor.config.ts.
 */
export interface GoogleOneTapAuthPluginOptions {
  /**
   * Your client ID of type Web application. Can also be set in capacitor.config.ts.
   */
  clientId?: string;
}

export interface SignInOptions extends GoogleOneTapAuthPluginOptions {
  /**
   * A random string for ID tokens.
   */
  nonce?: string;

  // /**
  //  * If true and there is one account from which the user logged in previously then auto-login is iniated.
  //  * If false then the user must always confirm to log in with the displayed account.
  //  * The default value is true.
  //  */
  // autoSignIn?: boolean;

  /**
   * Additional options for the web platform.
   */
  webOptions?: SignInWebOptions;
}

export interface SignInWebOptions {
  /**
   * 	Enables upgraded One Tap UX on ITP browsers. The default value is false.
   */
  itpSupport?: boolean;

  /**
   * 	The Sign In With Google button UX flow. The default value is 'popup'.
   */
  uxMode?: 'popup' | 'redirect';
}

export interface SignInResult {
  isSuccess: boolean;
  noSuccessReasonCode?: string; // See google.PromptMomentNotification
  selectBy?: 
    | 'auto'
    | 'user'
    | 'user_1tap'
    | 'user_2tap'
    | 'btn'
    | 'btn_confirm'
    | 'btn_add_session'
    | 'btn_confirm_add_session' // see google.CredentialResponse.select_by
  idToken?: string;
  decodedIdToken?: any;
}

export interface SignOutResult {
  isSuccess: boolean;
  error?: string;
}

export interface GoogleOneTapAuthPlugin {
  /**
   * For the web platform, starts pre-loading the google one tap JavaScript library. Calling initialize is optional.
   */
  initialize(): Promise<void>;
  /**
   * Tries to auto-sign in the user.
   * If there is no single user session that logged in previously in the app, the sign-in will fail.
   * @param options 
   */
  tryAutoSignIn(options: SignInOptions): Promise<SignInResult>;
  /**
   * Tries to shows the one-tab user selection popup.
   * If there is no authorized session in the browser it will fail and the login button must be shown.
   * @param options 
   */
  trySignInWithPrompt(options: SignInOptions): Promise<SignInResult>;
  /**
   * Tries to auto-sign in the user and if not possible tries to shows the one-tab user selection.
   * If there is no authorized session in the browser it will fail and the login button must be shown.
   * @param options 
   */
  tryAutoSignInThenTrySignInWithPrompt(options: SignInOptions): Promise<SignInResult>;
  signOut(): Promise<SignOutResult>;
  renderButton(parentElementId: string, options: SignInOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult>;
}
