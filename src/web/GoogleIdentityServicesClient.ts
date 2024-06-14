/// <reference types="gapi" />
/// <reference types="google.accounts" />

import { NoSuccessSignInResult, SignOutResult, RenderSignInButtonOptions, RenderSignInButtonWebOptions } from '../definitions';
import { assert, loadScript } from '../helpers';
import type { NotEnrichedSuccessSignInResult } from '../definitionsInternal';

type ResolveSignInFunc = (result: NotEnrichedSuccessSignInResult) => void;

const gsiScriptUrl = 'https://accounts.google.com/gsi/client';
let gapiLoadedPromise: Promise<void> | undefined = undefined;

export function initialize() {
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
    log_level: 'error' // 'debug'
  } as google.accounts.id.IdConfiguration & { use_fedcm_for_prompt: boolean });
}

export async function signIn(autoSelect: boolean, clientId: string, nonce?: string) {
  return new Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult>(async (resolve, _reject) => {
    oneTapInitialize(autoSelect, clientId, nonce, resolve); // The resolve function is passed, so it can be called in handleCredentialResponse.
    // Display the One Tap prompt or the browser native credential manager.
    google.accounts.id.prompt((notification) => {
      // console.log('notification', notification)
      const configurationErrors = ['missing_client_id', 'unregistered_origin'];
      const momentReason = getMomentReason(notification);

      if (momentReason !== undefined && configurationErrors.includes(momentReason)) {
        resolve({
          noSuccessReasonCode: 'configuration_error',
          noSuccessAdditionalInfo: momentReason
        });
      }
      else if (momentReason === 'credential_returned') {
        // Do nothing, handled in handleCredentialResponse.
      }
      else if (notification.isSkippedMoment()
        || notification.isDismissedMoment()) {
        resolve({
          noSuccessReasonCode: momentReason
        });
      }
      else {
        // Do nothing, may be display moment indicating that the prompt is displayed.
        // But could also be display moment indicating that the prompt is not displayed because it is suppressed_by_user (cooldown period).
      }
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
  assert(() => !!parentElem)
  var signInPromise = new Promise<NotEnrichedSuccessSignInResult>((resolve) => {
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
  return signInPromise;
}

function handleCredentialResponse(credentialResponse: google.accounts.id.CredentialResponse, resolveSignInFunc: ResolveSignInFunc) {
  let signInResult: NotEnrichedSuccessSignInResult = {
    idToken: credentialResponse.credential,
    isAutoSelect: credentialResponse.select_by === 'auto',
  };
  resolveSignInFunc(signInResult);
}

export function cancel() {
  google.accounts.id.cancel();
}

export function signOut(authenticatedUserId: string | undefined): Promise<SignOutResult> {
  return new Promise<SignOutResult>((resolve) => {
    if (authenticatedUserId) {
      // Calling revoke method revokes all OAuth2 scopes previously granted by the Sign In With Google client library.
      google.accounts.id.revoke(authenticatedUserId, response => {
        if (response.successful) {
          resolve({ isSuccess: true });
        }
        else {
          resolve({ isSuccess: false, error: response.error });
        }
      });
    } else {
      resolve({ isSuccess: true });
    }
  });
}