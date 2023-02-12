import { WebPlugin } from '@capacitor/core';
import { SignInResult, SignOutResult, GoogleOneTapAuthPlugin, SignInOptions } from './definitions';
import * as scriptjs from 'scriptjs';
import jwt_decode from 'jwt-decode';
import { assert } from './helpers';

// Workaround for 'error TS2686: 'google' refers to a UMD global, but the current file is a module. Consider adding an import instead.'
declare var google: {
  accounts: google.accounts
};

type ResolveSignInFunc = (user: SignInResult) => void;

// See https://developers.google.com/identity/gsi/web/guides/use-one-tap-js-api
export class GoogleOneTapAuthWeb extends WebPlugin implements GoogleOneTapAuthPlugin {
  gsiScriptUrl = 'https://accounts.google.com/gsi/client';
  gapiLoadedPromise?: Promise<void> = undefined;
  authenticatedUserId?: string = undefined;

  initialize(): Promise<void> {
    if (!this.gapiLoadedPromise) {
      this.gapiLoadedPromise = new Promise<void>((resolve) => {
        scriptjs.get(this.gsiScriptUrl, () => {
          resolve();
        });
      });
    }
    return this.gapiLoadedPromise;
  }

  async tryAutoSignIn(options: SignInOptions): Promise<SignInResult> {
    let signInResult = await this.doSignIn(options, true);

    if (!signInResult.isSuccess) {
      signInResult = await this.doSignIn(options, false);
    }
    return signInResult;
  }

  async trySignInWithPrompt(options: SignInOptions): Promise<SignInResult> {
    return await this.doSignIn(options, false);
  }

  async tryAutoSignInThenTrySignInWithPrompt(_options: SignInOptions): Promise<SignInResult> {
    throw new Error('not implemented');
  }

  async renderButton(parentElementId: string, options: SignInOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult> {
    const parentElem = document.getElementById(parentElementId);
    assert(() => !!parentElem)

    await this.initialize();
    var signInPromise = new Promise<SignInResult>((resolve) => {
      this.oneTapInitialize(options, false, resolve);

      google.accounts.id.renderButton(
        parentElem!,
        gsiButtonConfiguration || {}
      );
    });
    return signInPromise;
  }

  private async doSignIn(options: SignInOptions, autoSelect: boolean) {
    assert(() => !!options.clientId);

    await this.initialize();
    var signInPromise = new Promise<SignInResult>((resolve) => {
      this.oneTapInitialize(options, autoSelect, resolve);

      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()
          || notification.isSkippedMoment()
          || notification.isDismissedMoment()) {
          resolve({
            isSuccess: false,
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

  private oneTapInitialize(options: SignInOptions, autoSelect: boolean, resolveSignInFunc: ResolveSignInFunc) {
    console.log("clientId: " + options.clientId);
    google.accounts.id.initialize({
      client_id: options.clientId!,
      callback: (credentialResponse) => this.handleCredentialResponse(credentialResponse, resolveSignInFunc),
      auto_select: autoSelect,
      itp_support: options.webOptions?.itpSupport || false,
      cancel_on_tap_outside: false,
      ux_mode: options.webOptions?.uxMode || 'popup',
    });
  }

  private handleCredentialResponse(credentialResponse: google.CredentialResponse, resolveSignInFunc: ResolveSignInFunc) {
    const decodedIdToken = jwt_decode(credentialResponse.credential) as any;
    let signInResult: SignInResult = {
      isSuccess: true,
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
}