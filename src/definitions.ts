/// <reference types="@capacitor/cli" />

declare module '@capacitor/cli' {
  export interface PluginsConfig {
    GoogleOneTapAuth: GoogleOneTapAuthPluginOptions;
  }
}

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
  /**
   * A reason code as 'opt_out_or_no_session'.
   * For the js library see google.PromptMomentNotification for possible values.
   * For android 'SIGN_IN_REQUIRED' and 'SIGN_IN_CANCELLED' are currently set.
   */
  noSuccessReasonCode?: string;
  /**
   * A error message.
   * Set in case of error if the native android code is used.
   */
  noSuccessAdditionalInfo?: string;
  /**
   * How the credential was retrieved.
   * Currently not available for android, only if the js library is used.
   * For possible values see google.PromptMomentNotification.
   */
  selectBy?: 
    | 'auto'
    | 'user'
    | 'user_1tap'
    | 'user_2tap'
    | 'btn'
    | 'btn_confirm'
    | 'btn_add_session'
    | 'btn_confirm_add_session' // see google.CredentialResponse.select_by
  /**
   * The JWT token base64 encoded.
   * Will be set if successful.
   */
  idToken?: string;
  /**
   * A permanent id for the user.
   */
  userId?: string;
  /**
   * The email address.
   */
  email?: string;
  /**
   * The decoded JWT token.
   * Will be set if successful.
   * The signature is not verified when decoding the token.
   */
  decodedIdToken?: any;
}

export interface SignOutResult {
  isSuccess: boolean;
  error?: string;
}

export interface GoogleOneTapAuthPlugin {
  /**
   * For the web platform, starts pre-loading the google one tap JavaScript library. Calling initialize is optional but makes further calls faster.
   */
  initialize(): Promise<void>;
  /**
   * Tries to auto-sign in the user.
   * If there is a single google account and that account has previously signed into the app, then that user is auto signed in. A short popover is displayed during sign-in.
   * If there are multiple google accounts and more than one have previously signed into the app then a user selection screen is shown.
   * If there is no active google session or if no user session has logged in previously in the app, the sign-in will fail.
   * @param options 
   */
  tryAutoSignIn(options: SignInOptions): Promise<SignInResult>;
  /**
   * Tries to shows the one-tab user selection popup.
   * If there is no active google session or if no user session has logged in previously in the app, the sign-in will fail.
   * This method may be used if the user wants to sign-in with a different account.
   * @param options 
   */
  trySignInWithPrompt(options: SignInOptions): Promise<SignInResult>;
  /**
   * Tries to auto-sign in the user and if not possible tries to shows the one-tab user selection.
   * If there is no authorized session in the browser it will use Google Sign in.
   * @param options 
   */
  tryAutoSignInThenTrySignInWithPrompt(options: SignInOptions): Promise<SignInResult>;
  signOut(): Promise<SignOutResult>;
  renderButton(parentElementId: string, options: SignInOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult>;
}
