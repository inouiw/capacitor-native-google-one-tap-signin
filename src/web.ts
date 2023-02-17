import { WebPlugin } from '@capacitor/core';
import { InitializeOptions, SignInResultOption, SuccessSignInResult, NoSuccessSignInResult, SignOutResult, RenderSignInButtonOptions, RenderSignInButtonWebOptions } from './definitions';
import * as scriptjs from 'scriptjs';
import jwt_decode from 'jwt-decode';
import { assert } from './helpers';

// Workaround for 'error TS2686: 'google' refers to a UMD global, but the current file is a module. Consider adding an import instead.'
declare var google: {
  accounts: google.accounts
};

type ResolveSignInFunc = (result: SuccessSignInResult) => void;

// See https://developers.google.com/identity/gsi/web/guides/use-one-tap-js-api
export class GoogleOneTapAuthWeb extends WebPlugin {
  gsiScriptUrl = 'https://accounts.google.com/gsi/client';
  gapiLoadedPromise?: Promise<void> = undefined;
  authenticatedUserId?: string = undefined;
  clientId?: string = undefined;
  nonce?: string = undefined;

  async initialize(options: InitializeOptions): Promise<void> {
    this.clientId = options.clientId;
    this.nonce = options.nonce;
    if (!this.gapiLoadedPromise) {
      this.gapiLoadedPromise = new Promise<void>((resolve) => {
        scriptjs.get(this.gsiScriptUrl, () => {
          resolve();
        });
      });
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

  async renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SuccessSignInResult> {
    const parentElem = document.getElementById(parentElementId);
    assert(() => !!parentElem)
    var signInPromise = new Promise<SuccessSignInResult>((resolve) => {
      this.oneTapInitialize(false, resolve, options.webOptions);

      google.accounts.id.renderButton(
        parentElem!,
        gsiButtonConfiguration || {}
      );
    });
    return signInPromise;
  }

  private async doSignIn(autoSelect: boolean) {
    var signInPromise = new Promise<SuccessSignInResult | NoSuccessSignInResult>((resolve) => {
      this.oneTapInitialize(autoSelect, resolve);

      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()
          || notification.isSkippedMoment()
          || notification.isDismissedMoment()) {
          resolve({
            noSuccessReasonCode: this.getMomentReason(notification)
          });
        }
      });
    });
    return signInPromise;
  }

  private getMomentReason(notification: google.PromptMomentNotification) {
    if (notification.isNotDisplayed()) {
      return notification.getNotDisplayedReason();
    }
    if (notification.isSkippedMoment()) {
      return notification.getSkippedReason();
    }
    if (notification.isDismissedMoment()) {
      return notification.getDismissedReason();
    }
    return undefined;
  }

  private oneTapInitialize(autoSelect: boolean, resolveSignInFunc: ResolveSignInFunc, webOptions?: RenderSignInButtonWebOptions) {
    google.accounts.id.initialize({
      client_id: this.clientId!,
      callback: (credentialResponse) => this.handleCredentialResponse(credentialResponse, resolveSignInFunc),
      auto_select: autoSelect,
      itp_support: webOptions?.itpSupport || false,
      cancel_on_tap_outside: false,
      ux_mode: webOptions?.uxMode || 'popup',
      nonce: this.nonce,
    });
  }

  private handleCredentialResponse(credentialResponse: google.CredentialResponse, resolveSignInFunc: ResolveSignInFunc) {
    const decodedIdToken = jwt_decode(credentialResponse.credential) as any;
    let signInResult: SuccessSignInResult = {
      idToken: credentialResponse.credential,
      userId: decodedIdToken.sub,
      email: decodedIdToken.email,
      selectBy: credentialResponse.select_by,
      decodedIdToken: decodedIdToken
    };
    this.authenticatedUserId = decodedIdToken['sub'] as string;
    // console.log(decodedIdToken);
    resolveSignInFunc(signInResult);
  }

  signOut(): Promise<SignOutResult> {
    return new Promise<SignOutResult>((resolve) => {
      google.accounts.id.cancel();

      if (this.authenticatedUserId) {
        // Calling revoke method revokes all OAuth2 scopes previously granted by the Sign In With Google client library.
        google.accounts.id.revoke(this.authenticatedUserId, response => {
          if (response.successful) {
            resolve({ isSuccess: true });
          }
          else {
            resolve({ isSuccess: false, error: response.error });
          }
        });
        this.authenticatedUserId = undefined;
      } else {
        resolve({ isSuccess: true });
      }
    });
  }

  getNonce(): string {
    throw new Error('Should never be called because handled wrapper class.');
  }
}