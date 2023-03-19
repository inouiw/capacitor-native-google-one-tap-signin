import { Capacitor, registerPlugin } from '@capacitor/core';
import type { InitializeOptions, GoogleOneTapAuthPlugin, SignInResultPromises, SuccessSignInResult, SignOutResult, RenderSignInButtonOptions, NoSuccessSignInResult } from './definitions';
import { assert, randomHexString } from './helpers';
import { GoogleOneTapAuthWeb } from './web';

const GoogleOneTapAuthPlatform = registerPlugin<GoogleOneTapAuthWeb>('GoogleOneTapAuth', {
  web: () => new GoogleOneTapAuthWeb(),
});

// This file is the entry point for all plugin methods. It contains common logic to web, android, iOS or delegates to the specific implementation.
class GoogleOneTapAuth implements GoogleOneTapAuthPlugin {
  nonce?: string;
  isInitialized = false;

  async initialize(options: InitializeOptions): Promise<void> {
    if (!options.clientId || options.clientId.endsWith("apps.googleusercontent.com") == false) {
      throw new Error("clientId must end with 'apps.googleusercontent.com' but is: " + options.clientId);
    }
    this.nonce = options.nonce = options.nonce || randomHexString(10);
    await GoogleOneTapAuthPlatform.initialize(options);
    this.isInitialized = true;
  }

  async tryAutoOrOneTapSignIn(): Promise<SignInResultPromises> {
    assert(() => this.isInitialized, 'Must call and await initialize first.');
    const signInResultOptionPromise = GoogleOneTapAuthPlatform.tryAutoOrOneTapSignIn();
    let signInResultOption = await signInResultOptionPromise;

    if (signInResultOption.isSuccess) {
      return {
        successPromise: Promise.resolve(signInResultOption.success!),
        noSuccess: new Promise<NoSuccessSignInResult>(() => {}),
        signInResultOptionPromise: signInResultOptionPromise
      };
    } else {
      return {
        successPromise: new Promise<SuccessSignInResult>(() => {}),
        noSuccess: Promise.resolve(signInResultOption.noSuccess!),
        signInResultOptionPromise: signInResultOptionPromise
      };
    }
  }

  signOut(): Promise<SignOutResult> {
    return GoogleOneTapAuthPlatform.signOut();
  }
  
  renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SuccessSignInResult> {
    assert(() => this.isInitialized, 'Must call and await initialize first.');
    options.webOptions = options.webOptions || {};
    if (Capacitor.getPlatform() === 'web') {
      return GoogleOneTapAuthPlatform.renderSignInButton(parentElementId, options, gsiButtonConfiguration);
    }
    const parentElem = document.getElementById(parentElementId);
    assert(() => !!parentElem);
    return new Promise<SuccessSignInResult>((resolve) => {
      const onClickAction = async () => {
        let signInResult = await (GoogleOneTapAuthPlatform as any).triggerGoogleSignIn(options);
        if (Boolean(signInResult.idToken)) {
          resolve(signInResult);
        }
      };
      parentElem!.appendChild(this._getSignInButtonHtml(onClickAction));
    });
  }

  getNonce() {
    assert(() => !!this.nonce, `The nonce is only set after ${() => this.initialize} was called.`);
    return this.nonce!;
  }

  _getSignInButtonHtml(onClickAction: () => any) {
    // HTML from https://github.com/inouiw/ReactSignInWithGoogleButton
    const button = document.createElement('button');
    button.setAttribute("style", "border-radius: 4px; background-color: rgb(255, 255, 255); border: 1px solid rgb(218, 220, 224); color: rgb(60, 64, 67); cursor: pointer; font-family: Roboto; font-weight: 500; font-size: 14px; height: 40px; letter-spacing: 0.25px; padding: 0px 12px; position: relative; text-align: center; vertical-align: middle; width: auto;");
    button.onclick = onClickAction;
    button.innerHTML = `
      <div style="display: flex; align-items: center; flex-flow: row nowrap; justify-content: space-between; height: 100%; position: relative; width: 100%;">
        <div style="height: 18px; margin-right: 8px; min-width: 18px; width: 18px;">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
            <g>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </g>
          </svg>
        </div>
        <p>Sign in with Google</p>
      </div>`;
    return button;
  }
}

const googleOneTapAuth = new GoogleOneTapAuth();
export { googleOneTapAuth as GoogleOneTapAuth }