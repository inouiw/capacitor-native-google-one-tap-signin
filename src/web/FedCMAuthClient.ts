// The FedCM browser API is a new privacy-preserving alternative to third-party cookies for federated identity providers like google.

import { NoSuccessSignInResult, SignOutResult } from "../definitions";
import { NotEnrichedSuccessSignInResult } from "../definitionsInternal";

type IdentityCredential = Credential & { isAutoSelect: boolean, token: string }

let fedCMAbortController: AbortController | undefined = undefined;
const cancelCalledAbortReason = 'CANCEL_CALLED';

export function isFedCMSupported(): boolean {
  return 'IdentityCredential' in window;
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
            clientId: clientId!,
            // loginHint: ''
            nonce: nonce
          }
        ]
      },
      mediation: autoSelect ? 'optional' : 'required' as 'optional' | 'required' | 'silent',
      signal: fedCMAbortController.signal
    } as any) as IdentityCredential;

    // console.log('fedCMSignIn result: ', identityCredential);

    if (!identityCredential?.token) {
      return {
      };
    }

    return {
      idToken: identityCredential.token,
      isAutoSelect: identityCredential.isAutoSelect
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
    return {
    };
  }
  finally {
    fedCMAbortController = undefined;
  }
}

export function signOut(_authenticatedUserId: string | undefined): Promise<SignOutResult> {
  navigator.credentials.preventSilentAccess();
  return Promise.resolve({ isSuccess: true });
}

export function cancel() {
  fedCMAbortController?.abort({ message: cancelCalledAbortReason });
}
