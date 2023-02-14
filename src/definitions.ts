/// <reference types="@capacitor/cli" />

export interface InitializeOptions {
  /**
   * Your client ID of type Web application.
   */
  clientId: string;
  /**
   * A string that is included in the ID token. It is auto-generated if not provided.
   */
  nonce?: string;
}

export interface SignInResult {
  /**
   * If the user could be authenticated.
   */
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

export interface RenderSignInButtonOptions {
  /**
   * 	Web platform specific options..
   */
  webOptions?: RenderSignInButtonWebOptions;
}

export interface RenderSignInButtonWebOptions {
  /**
   * 	Enables upgraded One Tap UX on ITP browsers. The default value is false.
   */
  itpSupport?: boolean;
  /**
   * 	The Sign In With Google button UX flow. The default value is 'popup'.
   */
  uxMode?: 'popup' | 'redirect';
}

export interface SignOutResult {
  isSuccess: boolean;
  error?: string;
}

export interface GoogleOneTapAuthPlugin {
  /**
   * For the web platform, starts pre-loading the google one tap JavaScript library.
   * @param options 
   */
  initialize(options: InitializeOptions): Promise<void>;
  /**
   * Tries to auto-sign in the user.
   * If there is a single google account and that account has previously signed into the app, then that user is auto signed in. A short popover is displayed during sign-in.
   * If there are multiple google accounts and more than one have previously signed into the app then a user selection screen is shown.
   * If there is no active google session or if no user session has logged in previously in the app or if the user has opt out of One Tap, the auto sign-in will fail.
   * See https://developers.google.com/identity/gsi/web/guides/features
   */
  tryAutoSignIn(): Promise<SignInResult>;
  /**
   * 
   * @param parentElementId 
   * @param options 
   * @param gsiButtonConfiguration Not all button configuration options are supported on android.
   */
  renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult>;
  /**
   * Ends the session.
   */
  signOut(): Promise<SignOutResult>;
  /**
   * Gets the last user defined or auto-created nonce.
   */
  getNonce(): string;
}
