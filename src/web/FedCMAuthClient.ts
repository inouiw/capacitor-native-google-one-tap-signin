// The Federated Credential Management (FedCM) browser API is a new privacy-preserving alternative to third-party cookies for federated identity providers like google.

import type { DisconnectResult, NoSuccessSignInResult, SignOutResult } from "../definitions";
import type { NotEnrichedSuccessSignInResult } from "../definitionsInternal";

type IdentityCredential = Credential & { isAutoSelected: boolean, token: string };

let fedCMAbortController: AbortController | undefined = undefined;
const cancelCalledAbortReason = 'CANCEL_CALLED';

export function isFedCMSupported(): boolean {
  return typeof(window) !== 'undefined' && 'IdentityCredential' in window;
}

export async function signIn(autoSelect: boolean, clientId: string, nonce?: string): Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult> {
  try {
    // console.log(`IdentityCredential supported: ${isFedCMSupported()}`);
    fedCMAbortController = new AbortController();
    // see https://developers.google.com/privacy-sandbox/3pcd/fedcm
    // see https://developers.google.com/privacy-sandbox/blog/fedcm-auto-reauthn
    const identityCredential = await navigator.credentials.get({
      identity: {
        context: 'signin',
        providers: [
          {
            configURL: 'https://accounts.google.com/gsi/fedcm.json',
            clientId: clientId,
            // loginHint: ''
            nonce: nonce
          }
        ]
      },
      mediation: autoSelect ? 'optional' : 'required' as 'optional' | 'required' | 'silent',
      signal: fedCMAbortController.signal
    } as any) as IdentityCredential;

    if (!identityCredential?.token) {
      return {};
    }

    return {
      idToken: identityCredential.token,
      isAutoSelected: identityCredential.isAutoSelected
    };
  } catch (e) {
    // NotSupportedError DOMException
    // IdentityCredentialError DOMException
    // NetworkError DOMException --> name: 'NetworkError'
    // NotAllowedError DOMException
    const name = (e as Error).name ?? '';
    const message = (e as Error).message ?? '';
    // console.log('fedCMSignIn error: ', e, name);

    if (message.includes(cancelCalledAbortReason)
      || (name === 'NetworkError' && message.includes('Error retrieving a token.'))) {
      return {
        noSuccessReasonCode: 'SIGN_IN_CANCELLED'
      };
    }

    return {};
  } finally {
    fedCMAbortController = undefined;
  }
}

export function signOut(_authenticatedUserId: string | undefined): Promise<SignOutResult> {
  navigator.credentials.preventSilentAccess();
  return Promise.resolve({ isSuccess: true });
}

export function disconnect(_authenticatedUserId: string | undefined): Promise<DisconnectResult> {
  google.accounts.id.disableAutoSelect();
  return Promise.resolve({ isSuccess: true });
}

export function cancel(): void {
  fedCMAbortController?.abort({ message: cancelCalledAbortReason });
}
