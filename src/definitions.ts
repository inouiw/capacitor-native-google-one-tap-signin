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
   */
  isAutoSelected?: boolean;
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
   * A reason code for the no success result.
   */
  noSuccessReasonCode?: 'SIGN_IN_CANCELLED' | string;
  /**
   * Additional information relating to the cause of the no success result.
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
   * 	The Sign In With Google button UX flow. The default value is 'popup'.
   */
  uxMode?: 'popup' | 'redirect';
}

export interface SignOutResult {
  isSuccess: boolean;
  error?: string;
}

export interface DisconnectResult {
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
   * If you await the result, it will throw on error.
   * @param options 
   */
  initialize(options: InitializeOptions): Promise<void>;

  /**
   * Tries to first auto-sign-in the user and if not successful uses one tap/click sign-in.
   * @returns A Promise that resolves to a result option object.
   */
  tryAutoOrOneTapSignIn()
    : Promise<SignInResultOption>;

  /**
   * Tries to first auto-sign-in and if not successful sign-in the user with one tap/click.
   * @param onResult A callback that is passed the result option object.
   */
  tryAutoOrOneTapSignInWithCallback(onResult: (value: SignInResultOption) => void)
  : Promise<void>;

  /**
   * Tries to auto-sign-in the user without any user interaction needed.
   * If there is a single google account and that account has previously signed into the app, 
   * then that user is auto signed in. A short popover is displayed during sign-in.
   * For android, sets FilterByAuthorizedAccounts to true. See https://developer.android.com/identity/sign-in/credential-manager-siwg
   * @returns A Promise that resolves to a result option object.
   */
  tryAutoSignIn()
    : Promise<SignInResultOption>;

  /**
   * Tries to show the sign-in UI without trying to auto sign-in the user.
   * For android, sets FilterByAuthorizedAccounts to false. See https://developer.android.com/identity/sign-in/credential-manager-siwg
   * @returns A Promise that resolves to a result option object.
   */
  tryOneTapSignIn()
    : Promise<SignInResultOption>;

  /**
   * @deprecated Use addSignInActionToExistingButtonWithCallback instead.
   * 
   * Allows using a custom sign-in button.
   * The element to which buttonParentId refers must have the style position: 'relative'.
   * For the web platform, the implementation renders the google button invisible in front of
   * the passed button.
   * @param buttonParentId 
   * @param buttonId
   * @param onResult A callback that is passed the result option object.
   * @returns A Promise with a success result, that resolves when the signIn is successful.
   */
  addSignInActionToExistingButton(
    buttonParentId: string,
    buttonId: string)
    : Promise<SuccessSignInResult>;

  /**
   * Allows using a custom sign-in button.
   * The element to which buttonParentId refers must have the style position: 'relative'.
   * For the web platform, the implementation renders the google button invisible in front of
   * the passed button.
   * @param buttonParentId 
   * @param buttonId
   * @param onResult A callback that is passed the result option object.
   */
  addSignInActionToExistingButtonWithCallback(
    buttonParentId: string,
    buttonId: string,
    onResult: (value: SignInResultOption) => void)
    : Promise<void>;

  /**
   * @deprecated Use renderSignInButtonWithCallback instead.
   * 
   * Renders the sign-in button.
   * The returned promise will only resolve if successful.
   * The returned promise is rejected for unrecoverable errors as 'unregistered_origin' 
   * for the web platform.
   * @param parentElementId 
   * @param options 
   * @param gsiButtonConfiguration Not all button configuration options are supported on android.
   * @returns A Promise with a success result, that resolves when the signIn is successful.
   */
  renderSignInButton(
    parentElementId: string,
    options: RenderSignInButtonOptions,
    gsiButtonConfiguration?: google.accounts.id.GsiButtonConfiguration)
    : Promise<SuccessSignInResult>;

  /**
   * Renders a google style sign-in button.
   * @param parentElementId 
   * @param options 
   * @param gsiButtonConfiguration Not all button configuration options are supported on android.
   * @param onResult A callback that is passed the result option object.
   */
  renderSignInButtonWithCallback(
    parentElementId: string,
    options: RenderSignInButtonOptions,
    gsiButtonConfiguration: google.accounts.id.GsiButtonConfiguration | undefined,
    onResult: (value: SignInResultOption) => void)
    : Promise<void>;

  /**
   * Closes the One Tap prompt.
   */
  cancelOneTapDialog(): void;

  /**
   * Ends the credential session with google.
   */
  signOut(): Promise<SignOutResult>;

  /**
   * Revokes all OAuth 2.0 scopes previously granted.
   * Supported by iOS and web. Calls signOut for android.
   */
  disconnect(): Promise<DisconnectResult>;

  /**
   * Gets the last user defined or auto-created nonce.
   * Unfortunately not all google libraries support setting a nonce, so this is currently 
   * not universally useful.
   */
  getNonce(): string;
}
