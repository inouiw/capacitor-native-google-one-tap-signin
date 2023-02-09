import { WebPlugin } from '@capacitor/core';
import { SignInResult, GoogleOneTapAuthPlugin, SignInOptions } from './definitions';
import * as scriptjs from 'scriptjs';
import jwt_decode from 'jwt-decode';
import { PromptMomentNotification } from 'google-one-tap';

// Workaround for 'error TS2686: 'google' refers to a UMD global, but the current file is a module. Consider adding an import instead.'
declare var google: {
  accounts: google.accounts
};

// See https://developers.google.com/identity/gsi/web/guides/use-one-tap-js-api
export class GoogleOneTapAuthWeb extends WebPlugin implements GoogleOneTapAuthPlugin {
  gsiScriptUrl = 'https://accounts.google.com/gsi/client';
  gapiLoadedPromise: Promise<void> = null;
  resolveGapiLoaded: () => void;
  signInPromise: Promise<SignInResult>;
  resolveSignInPromise: (user: SignInResult) => void;
  authenticatedUserId: string = null;

  initialize(): Promise<void> {
    if (this.gapiLoadedPromise == null) {
      this.gapiLoadedPromise = new Promise<void>((resolve) => {
        this.resolveGapiLoaded = resolve;
      });
      this.loadScript();
    }
    return this.gapiLoadedPromise;
  }

  private loadScript() {
    scriptjs.get(this.gsiScriptUrl, () => {
      this.resolveGapiLoaded();
    });
  }

  async tryAutoSignIn(options: SignInOptions): Promise<SignInResult> {
    return await this.doSignIn(options, true);
  }

  async trySignInWithPrompt(options: SignInOptions): Promise<SignInResult> {
    return await this.doSignIn(options, false);
  }

  async tryAutoSignInThenTrySignInWithPrompt(options: SignInOptions): Promise<SignInResult> {
    let signInResult = await this.doSignIn(options, true);

    if (!signInResult.isSuccess) {
      signInResult = await this.doSignIn(options, false);
    }
    return signInResult;
  }

  async renderButton(parentElementId: string, options: SignInOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult> {
    const parentElem = document.getElementById(parentElementId);
    assert(() => !!parentElem)

    await this.initialize();
    this.createSignInPromise();
    this.oneTapInitialize(options, false);

    google.accounts.id.renderButton(
      parentElem!,
      gsiButtonConfiguration || {}
    );
    return this.signInPromise;
  }

  private async doSignIn(options: SignInOptions, autoSelect: boolean) {
    assert(() => !!options.clientId);

    await this.initialize();
    this.createSignInPromise();
    this.oneTapInitialize(options, autoSelect);

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()
        || notification.isSkippedMoment()
        || notification.isDismissedMoment()) {
        this.resolveSignInPromise({
          isSuccess: false,
          noSuccessReasonCode: this.getMomentReason(notification)
        });
        this.signInPromise = null;
      }
    });
    return this.signInPromise;
  }

  private createSignInPromise() {
    this.signInPromise = new Promise<SignInResult>((resolve) => {
      this.resolveSignInPromise = resolve;
    });
  }

  private getMomentReason(notification: PromptMomentNotification) {
    if (notification.isNotDisplayed()) {
      return notification.getNotDisplayedReason();
    }
    if (notification.isSkippedMoment()) {
      return notification.getSkippedReason();
    }
    if (notification.isDismissedMoment()) {
      return notification.getDismissedReason();
    }
    return null;
  }

  private oneTapInitialize(options: SignInOptions, autoSelect: boolean) {
    google.accounts.id.initialize({
      client_id: options.clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: autoSelect,
      itp_support: options.webOptions?.itpSupport || false,
      cancel_on_tap_outside: false,
      ux_mode: options.webOptions?.uxMode || 'popup',
    });
  }

  private handleCredentialResponse(credentialResponse: google.CredentialResponse) {
    const decodedIdToken = jwt_decode(credentialResponse.credential) as any;
    let signInResult: SignInResult = {
      isSuccess: true,
      idToken: credentialResponse.credential,
      selectBy: credentialResponse.select_by,
      decodedIdToken: decodedIdToken
    };
    this.authenticatedUserId = decodedIdToken['sub'] as string;
    // console.log(decodedIdToken);
    this.resolveSignInPromise(signInResult);
    this.signInPromise = null;
  }

  signOut(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      google.accounts.id.cancel();

      // When the user signs out of your website, you need to call the method disableAutoSelect to record the status in cookies. This prevents a UX dead loop. 
      google.accounts.id.disableAutoSelect();

      if (this.authenticatedUserId) {
        // Calling revoke method revokes all OAuth2 scopes previously granted by the Sign In With Google client library.
        google.accounts.id.revoke(this.authenticatedUserId, response => {
          if (response.successful) {
            resolve();
          }
          else {
            reject(response.error);
          }
        });
        this.authenticatedUserId = null;
      } else {
        resolve();
      }
    });
  }
}

function assert(predicate: () => boolean) {
  if (!predicate()) {
    throw Error(`Assert error, expected '${predicate}' to be true.`);
  }
}