/// <reference types="gapi" />
/// <reference types="google.accounts" />

import type { NoSuccessSignInResult, SignOutResult, RenderSignInButtonOptions, RenderSignInButtonWebOptions, DisconnectResult } from '../definitions';
import type { NotEnrichedSuccessSignInResult } from '../definitionsInternal';
import { assert, loadScript } from '../helpers';

type ResolveSignInFunc = (result: NotEnrichedSuccessSignInResult) => void;

const gsiScriptUrl = 'https://accounts.google.com/gsi/client';
let gapiLoadedPromise: Promise<void> | undefined = undefined;

export function initialize(): Promise<void> {
  if (gapiLoadedPromise === undefined) {
    gapiLoadedPromise = loadScript(gsiScriptUrl);
  }
  return gapiLoadedPromise;
}

function oneTapInitialize(autoSelect: boolean, clientId: string, nonce: string | undefined, resolveSignInFunc: ResolveSignInFunc, buttonWebOptions?: RenderSignInButtonWebOptions) {
  // The documenation says: "If you do call the google.accounts.id.initialize method multiple times, only the configurations in the last call is remembered and used.".
  // So it is safe to call initialize multiple times.
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (credentialResponse) => handleCredentialResponse(credentialResponse, resolveSignInFunc),
    auto_select: autoSelect,
    // see https://developers.google.com/identity/gsi/web/guides/itp
    itp_support: true,
    cancel_on_tap_outside: false, // same as for browser FedCM API.
    ux_mode: buttonWebOptions?.uxMode || 'popup',
    nonce: nonce,
    use_fedcm_for_prompt: true,
    use_fedcm_for_button: true,
    // log_level: 'debug'
  } as google.accounts.id.IdConfiguration & { use_fedcm_for_prompt: boolean });
}

export async function signIn(autoSelect: boolean, clientId: string, nonce?: string): Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult> {
  return new Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult>(async (resolve, _reject) => {
    await withHandleError(resolve, async () => {
      // The resolve function is passed, so it can be called in handleCredentialResponse.
      oneTapInitialize(autoSelect, clientId, nonce, resolve);
      // Display the One Tap prompt or the browser native credential manager.
      google.accounts.id.prompt((notification) => {
        const configurationErrors = ['missing_client_id', 'unregistered_origin'];
        const momentReason = getMomentReason(notification);

        if (momentReason !== undefined && configurationErrors.includes(momentReason)) {
          resolve({
            noSuccessReasonCode: 'configuration_error',
            noSuccessAdditionalInfo: momentReason
          });
        } else if (momentReason === 'credential_returned') {
          // Do nothing, handled in handleCredentialResponse.
        } else if (notification.isSkippedMoment()
          || notification.isDismissedMoment()) {
          resolve({
            noSuccessReasonCode: momentReason
          });
        } else {
          // Do nothing, may be display moment indicating that the prompt is displayed.
        }
      });
    });
  });
}

function getMomentReason(notification: google.accounts.id.PromptMomentNotification) {
  if (notification.isSkippedMoment()) {
    return 'SIGN_IN_CANCELLED';
  }
  if (notification.isDismissedMoment()) {
    const dismissedReason = notification.getDismissedReason(); // "credential_returned" | "cancel_called" | "flow_restarted"
    if (dismissedReason === 'cancel_called') {
      return 'SIGN_IN_CANCELLED';
    }
    return dismissedReason;
  }
  return 'UNKNOWN';
}

export async function renderSignInButton(clientId: string, nonce: string | undefined, parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.accounts.id.GsiButtonConfiguration)
  : Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult> {
  const parentElem = document.getElementById(parentElementId);
  assert(() => !!parentElem);
  
  const signInPromise = new Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult>(async (resolve) => {
    await withHandleError(resolve, async () => {
      oneTapInitialize(false, clientId, nonce, resolve, options.webOptions);

      // // Adding a click_listener allows to detect when the popup is opened.
      // (gsiButtonConfiguration as any).click_listener = () => {
      //   console.log('click_listener');
      // };
      google.accounts.id.renderButton(
        parentElem!,
        gsiButtonConfiguration!
      );
    });
  });
  return signInPromise;
}

function handleCredentialResponse(credentialResponse: google.accounts.id.CredentialResponse, resolveSignInFunc: ResolveSignInFunc) {
  const signInResult: NotEnrichedSuccessSignInResult = {
    idToken: credentialResponse.credential,
    isAutoSelected: credentialResponse.select_by === 'auto',
  };
  resolveSignInFunc(signInResult);
}

export function cancel(): void {
  google.accounts.id.cancel();
}

export function signOut(_authenticatedUserId: string | undefined): Promise<SignOutResult> {
  google.accounts.id.disableAutoSelect();
  return Promise.resolve({ isSuccess: true });
}

export function disconnect(authenticatedUserId: string | undefined): Promise<DisconnectResult> {
  return new Promise<DisconnectResult>(async (resolve) => {
    await withHandleErrorDisconnect(resolve, async () => {
      if (authenticatedUserId) {
        // Calling revoke method revokes all OAuth2 scopes previously granted by the Sign In With Google client library.
        google.accounts.id.revoke(authenticatedUserId, response => {
          if (response.successful) {
            resolve({ isSuccess: true });
          } else {
            resolve({ isSuccess: false, error: response.error });
          }
        });
      } else {
        resolve({ isSuccess: true });
      }
    });
  });
}

  // To run code and call onResult with NoSuccessSignInResult in case of error. Uses an existing onResult callback that the caller must provide.
  async function withHandleError(onResult: (value: NotEnrichedSuccessSignInResult | NoSuccessSignInResult) => void, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    }
    catch (e) {
      onResult({
        noSuccessAdditionalInfo: (e as any).toString(),
      });
    }
  }

  // To run code and call onResult with NoSuccessSignInResult in case of error. Uses an existing onResult callback that the caller must provide.
  async function withHandleErrorDisconnect(onResult: (value: DisconnectResult) => void, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    }
    catch (e) {
      onResult({
        isSuccess: false,
        error: (e as any).toString(),
      });
    }
  }
