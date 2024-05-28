import { WebPlugin } from '@capacitor/core';
import { InitializeOptions, SignInResultOption, SuccessSignInResult, NoSuccessSignInResult, SignOutResult, RenderSignInButtonOptions, RenderSignInButtonWebOptions } from './definitions';
import { assert, loadScript } from './helpers';
import type { NotEnrichedSuccessSignInResult } from './definitionsInternal';
import { type IdConfiguration } from 'google-one-tap';

// Workaround for 'error TS2686: 'google' refers to a UMD global, but the current file is a module. Consider adding an import instead.'
declare var google: {
  accounts: google.accounts
};

type ResolveSignInFunc = (result: NotEnrichedSuccessSignInResult) => void;

type IdentityCredential = Credential & { isAutoSelect: boolean, token: string }

// See https://developers.google.com/identity/gsi/web/guides/use-one-tap-js-api
export class GoogleOneTapAuthWeb extends WebPlugin {
  gsiScriptUrl = 'https://accounts.google.com/gsi/client';
  gapiLoadedPromise?: Promise<void> = undefined;
  initializeOptions?: InitializeOptions = undefined;
  isGapiLoadRequested = false;
  fedCMAbortController?: AbortController = undefined;

  async initialize(options: InitializeOptions): Promise<void> {
    this.initializeOptions = options;
    if (!this.gapiLoadedPromise) {
      this.gapiLoadedPromise = loadScript(this.gsiScriptUrl);
      this.isGapiLoadRequested = true;
    }
    return this.gapiLoadedPromise;
  }

  async tryAutoOrOneTapSignIn(): Promise<SignInResultOption> {
    let signInResult = await this.doSignIn(true);

    if (!(signInResult as SuccessSignInResult).idToken) {
      signInResult = await this.doSignIn(false);
    }

    if ((signInResult as SuccessSignInResult).idToken) {
      return {
        isSuccess: true,
        success: signInResult as SuccessSignInResult
      }
    } else {
      return {
        isSuccess: false,
        noSuccess: signInResult as NoSuccessSignInResult
      }
    }
  }

  async tryOneTapSignIn(): Promise<SignInResultOption> {
    let signInResult = await this.doSignIn(false);

    if ((signInResult as SuccessSignInResult).idToken) {
      return {
        isSuccess: true,
        success: signInResult as SuccessSignInResult
      }
    } else {
      return {
        isSuccess: false,
        noSuccess: signInResult as NoSuccessSignInResult
      }
    }
  }

  async tryAutoSignIn(): Promise<SignInResultOption> {
    let signInResult = await this.doSignIn(true);

    if ((signInResult as SuccessSignInResult).idToken) {
      return {
        isSuccess: true,
        success: signInResult as SuccessSignInResult
      }
    } else {
      return {
        isSuccess: false,
        noSuccess: signInResult as NoSuccessSignInResult
      }
    }
  }

  async renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<NotEnrichedSuccessSignInResult> {
    const parentElem = document.getElementById(parentElementId);
    assert(() => !!parentElem)
    var signInPromise = new Promise<NotEnrichedSuccessSignInResult>((resolve) => {
      this.oneTapInitialize(false, resolve, options.webOptions);

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

  private async fedCMSignIn(autoSelect: boolean, resolveSignInFunc: ResolveSignInFunc) {
    try {
      this.fedCMAbortController = new AbortController();
      // see https://developers.google.com/privacy-sandbox/3pcd/fedcm
      // see https://developers.google.com/privacy-sandbox/blog/fedcm-auto-reauthn
      const identityCredential = await navigator.credentials.get({
        identity: {
          context: 'signin',
          providers: [
            {
              configURL: 'https://accounts.google.com/gsi/fedcm.json',
              clientId: this.initializeOptions!.clientId!,
              // loginHint: ''
              nonce: this.initializeOptions!.nonce
            }
          ],
          mode: 'widget'
          // autoReauthn: autoSelect
        },
        mediation: autoSelect ? 'optional' : 'required' as 'optional' | 'required' | 'silent',
        signal: this.fedCMAbortController.signal
      } as any) as IdentityCredential;

      // console.log('fedCMSignIn result: ', identityCredential);

      if (!identityCredential?.token) {
        return false;
      }

      resolveSignInFunc({
        idToken: identityCredential.token,
        isAutoSelect: identityCredential.isAutoSelect
      });

      return true;
    } catch (e) {
      // NotSupportedError DOMException
      // IdentityCredentialError DOMException
      // NetworkError DOMException
      // NotAllowedError DOMException
      // console.error('fedCMSignIn Error: ', e);
      return false;
    }
  }

  private fedCMSignOut() {
    navigator.credentials.preventSilentAccess();
  }

  private fedCMAbort() {
    this.fedCMAbortController?.abort()
  }

  private async doSignIn(autoSelect: boolean) {
    var signInPromise = new Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult>(async (resolve, _reject) => {
      if (await this.fedCMSignIn(autoSelect, resolve) === false) {
        this.oneTapInitialize(autoSelect, resolve); // The resolve function is passed, so it can be called in handleCredentialResponse.
        google.accounts.id.prompt();
      }
    });
    return signInPromise;
  }

  private oneTapInitialize(autoSelect: boolean, resolveSignInFunc: ResolveSignInFunc, buttonWebOptions?: RenderSignInButtonWebOptions) {
    google.accounts.id.initialize({
      client_id: this.initializeOptions!.clientId!,
      callback: (credentialResponse) => this.handleCredentialResponse(credentialResponse, resolveSignInFunc),
      auto_select: autoSelect,
      itp_support: buttonWebOptions?.itpSupport || false,
      cancel_on_tap_outside: this.initializeOptions!.webOptions?.cancelOnTapOutside || true,
      ux_mode: buttonWebOptions?.uxMode || 'popup',
      nonce: this.initializeOptions!.nonce,
      use_fedcm_for_prompt: true,
      use_fedcm_for_button: true
      // log_level: 'debug'
    } as IdConfiguration & { use_fedcm_for_prompt: boolean });
  }

  private handleCredentialResponse(credentialResponse: google.CredentialResponse, resolveSignInFunc: ResolveSignInFunc) {
    let signInResult: NotEnrichedSuccessSignInResult = {
      idToken: credentialResponse.credential,
      isAutoSelect: credentialResponse.isAutoSelect,
    };
    resolveSignInFunc(signInResult);
  }

  cancelOneTapDialog(): void {
    if (this.isGapiLoadRequested === false) {
      this.fedCMAbort();
    }
    google.accounts.id.cancel();
  }

  signOut(authenticatedUserId: string | undefined): Promise<SignOutResult> {
    if (this.isGapiLoadRequested === false) {
      this.fedCMSignOut();
      return Promise.resolve({ isSuccess: true });
    }
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
}