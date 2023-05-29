/// <reference types="@capacitor/cli" />

export interface InitializeOptions {
  /**
   * Your client ID of type Web application.
   */
  clientId: string;
  /**
   * A string that is included in the ID token if supported. It is auto-generated if not provided.
   * The com.google.android.gms.auth.api.identity api supports nonce, however the 
   * com.google.android.gms.auth.api.signin does currently not, and for ios there is an open issue.
   * See https://github.com/google/GoogleSignIn-iOS/issues/135
   */
  nonce?: string;
}

export interface SignInResultPromises {
  successPromise: Promise<SuccessSignInResult>;
  noSuccess: Promise<NoSuccessSignInResult>;
  signInResultOptionPromise: Promise<SignInResultOption>;
}

export interface SignInResultOption {
  /**
   * Indicates if the success or noSuccess property is set.
   */
  isSuccess: boolean;
  /**
   * Success result.
   */
  success?: SuccessSignInResult;
  /**
   * NoSuccess result.
   */
  noSuccess?: NoSuccessSignInResult;
}

export interface SuccessSignInResult {
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
   */
  idToken: string;
  /**
   * A permanent id for the user.
   */
  userId: string;
  /**
   * The email address.
   */
  email: string;
  /**
   * The decoded JWT token.
   * The signature is not verified when decoding the token.
   */
  decodedIdToken: any;
}

export interface NoSuccessSignInResult {
  /**
   * A reason code as 'opt_out_or_no_session'.
   * For the js library see google.PromptMomentNotification for possible values.
   * For android 'SIGN_IN_CANCELLED' are currently set.
   */
  noSuccessReasonCode?: string;
  /**
   * A error message.
   * Set in case of error if the native android code is used.
   */
  noSuccessAdditionalInfo?: string;
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
   * Performs common or one-time initializations.
   * For the web platform, starts pre-loading the google one tap JavaScript library.
   * initialize must be called before any other method.
   * initialize remembers if it was called so it is safe to be called multiple times.
   * Other methods wait till initialize is finished so you must not await initialize.
   * @param options 
   */
  initialize(options: InitializeOptions): Promise<void>;
  /**
   * Tries to either auto-sign-in the user or sign-in the user with just one tap/click.
   * If there is a single google account and that account has previously signed into the app, 
   * then that user is auto signed in. A short popover is displayed during sign-in.
   * If there are multiple google accounts and more than one have previously signed into the 
   * app then a user selection screen is shown.
   * If there is no active google session or if no user session has logged in previously in 
   * the app or if the user has opt out of One Tap, then the response will indicate that 
   * the auto sign-in did not succeed.
   * See https://developers.google.com/identity/gsi/web/guides/features
   * @returns A Promise object that contains 3 properties with promises. One resolves only 
   * when authentication succeeds, the second on error and the third on success or error.
   */
  tryAutoOrOneTapSignIn()
  : Promise<{
    successPromise: Promise<SuccessSignInResult>;
    noSuccess: Promise<NoSuccessSignInResult>;
    signInResultOptionPromise: Promise<SignInResultOption>;
  }>;
    /**
   * Allows using a custom sign-in button.
   * The element to which buttonParentId refers must have the style position: 'relative'.
   * For the web platform, the implementation renders the google button invisible in front of the passed button.
   * The returned promise will only resolve if successful.
   * The returned promise is rejected for unrecoverable errors as 'unregistered_origin' 
   * for the web platform.
   * @param buttonParentId 
   * @param buttonId
   */
  addSignInActionToExistingButton(
    buttonParentId: string,
    buttonId: string)
    : Promise<SuccessSignInResult>;
  /**
   * Renders the sign-in button.
   * The returned promise will only resolve if successful.
   * The returned promise is rejected for unrecoverable errors as 'unregistered_origin' 
   * for the web platform.
   * @param parentElementId 
   * @param options 
   * @param gsiButtonConfiguration Not all button configuration options are supported on android.
   */
  renderSignInButton(
    parentElementId: string,
    options: RenderSignInButtonOptions,
    gsiButtonConfiguration?: google.GsiButtonConfiguration)
    : Promise<SuccessSignInResult>;
  /**
   * Ends the session.
   */
  signOut(): Promise<SignOutResult>;
  /**
   * Gets the last user defined or auto-created nonce.
   * Unfortunately not all google libraries support setting a nonce, so this is currently 
   * not universally useful.
   */
  getNonce(): string;
}
