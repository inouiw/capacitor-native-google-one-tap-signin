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

// See https://developers.google.com/identity/gsi/web/guides/use-one-tap-js-api
export class GoogleOneTapAuthWeb extends WebPlugin {
  gsiScriptUrl = 'https://accounts.google.com/gsi/client';
  gapiLoadedPromise?: Promise<void> = undefined;
  initializeOptions?: InitializeOptions = undefined;

  async initialize(options: InitializeOptions): Promise<void> {
    this.initializeOptions = options;
    if (!this.gapiLoadedPromise) {
      this.gapiLoadedPromise = loadScript(this.gsiScriptUrl);
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

  private async doSignIn(autoSelect: boolean) {
    var signInPromise = new Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult>((resolve, reject) => {
      this.oneTapInitialize(autoSelect, resolve); // The resolve function is passed, so it can be called in handleCredentialResponse.

      google.accounts.id.prompt((notification) => {
        const developerErrors = ['missing_client_id', 'unregistered_origin'];
        const momentReason = this.getMomentReason(notification);

        if (momentReason !== undefined && developerErrors.includes(momentReason)) {
          reject({ errorCode: momentReason } as NoSuccessSignInResult);
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
      });
    });
    return signInPromise;
  }

  private getMomentReason(notification: google.PromptMomentNotification) {
    if (notification.isSkippedMoment()) {
      return 'skipped';
    }
    if (notification.isDismissedMoment()) {
      return notification.getDismissedReason();
    }
    return undefined;
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
    } as IdConfiguration & { use_fedcm_for_prompt: boolean });
  }

  private handleCredentialResponse(credentialResponse: google.CredentialResponse, resolveSignInFunc: ResolveSignInFunc) {
    let signInResult: NotEnrichedSuccessSignInResult = {
      idToken: credentialResponse.credential,
      selectBy: credentialResponse.select_by,
    };
    resolveSignInFunc(signInResult);
  }

  cancelOneTapDialog(): void {
    google.accounts.id.cancel();
  }

  signOut(authenticatedUserId: string | undefined): Promise<SignOutResult> {
    return new Promise<SignOutResult>((resolve) => {
      google.accounts.id.cancel();

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