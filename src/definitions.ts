/// <reference types="@capacitor/cli" />

import type { GsiButtonConfiguration } from '@madauth/google-identity';

/**
 * Options of Google's sign-in button, see https://developers.google.com/identity/gsi/web/reference/js-reference#GsiButtonConfiguration.
 */
export type { GsiButtonConfiguration };

export interface InitializeOptions {
  /**
   * Your client ID of type Web application.
   */
  clientId: string;
  /**
   * A string that Google includes unchanged in the ID token's `nonce` claim, on web, Android and iOS.
   * It is auto-generated if not provided. Pass your server's nonce if the server checks it, e.g. madAuth.
   * If you pass a nonce, a restored iOS sign-in whose ID token has a different nonce is not returned:
   * tryAutoSignIn returns noSuccess and tryAutoOrOneTapSignIn shows the sign-in.
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
   * How the credential was retrieved: true if Google selected the account automatically, without user interaction.
   * Web only; not set on Android and iOS.
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
   * On all platforms, SIGN_IN_CANCELLED: the user closed the dialog, or cancelOneTapDialog was called.
   * On the web, Chrome reports a prompt it blocks after the user closed it (its cooldown) as SIGN_IN_CANCELLED too.
   * On the web also: skipped (the prompt was not shown, e.g. no Google session in the browser),
   * configuration_error (the client ID is missing or the page's origin is not authorized),
   * load_failed (Google's script could not be loaded) and error.
   * On Android and iOS also: NO_CREDENTIAL (no account to sign in with); on Android SIGN_IN_INTERRUPTED;
   * and the platform's error message otherwise.
   */
  noSuccessReasonCode?: 'SIGN_IN_CANCELLED' | 'skipped' | 'configuration_error' | 'load_failed' | 'error' | 'NO_CREDENTIAL' | 'SIGN_IN_INTERRUPTED' | string;
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
   * Calling it again with a different nonce, e.g. a new one from your server for each sign-in,
   * passes that nonce to the following sign-ins.
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
   * Triggers a Sign in with Google button flow for android and iOS.
   * For native platforms, it will trigger the same handler as when a button
   * with addSignInActionToExistingButtonWithCallback is clicked.
   * For android the displayed UI is different than when tryOneTapSignIn is called.
   * @returns A Promise that resolves to a result option object.
   */
  signInWithGoogleButtonFlowForNativePlatform()
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
   * @param parentElementId The id of the element to render the button into. On the web, its content is replaced by the button.
   * @param options 
   * @param gsiButtonConfiguration Not all button configuration options are supported on android.
   * @returns A Promise with a success result, that resolves when the signIn is successful.
   */
  renderSignInButton(
    parentElementId: string,
    options: RenderSignInButtonOptions,
    gsiButtonConfiguration?: GsiButtonConfiguration)
    : Promise<SuccessSignInResult>;

  /**
   * Renders a google style sign-in button.
   * @param parentElementId The id of the element to render the button into. On the web, its content is replaced by the button.
   * @param options 
   * @param gsiButtonConfiguration Not all button configuration options are supported on android.
   * @param onResult A callback that is passed the result option object.
   */
  renderSignInButtonWithCallback(
    parentElementId: string,
    options: RenderSignInButtonOptions,
    gsiButtonConfiguration: GsiButtonConfiguration | undefined,
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
   * Note that on iOS, without a nonce passed to initialize, a restored sign-in has the nonce of
   * the earlier sign-in that created it.
   */
  getNonce(): string;
}
