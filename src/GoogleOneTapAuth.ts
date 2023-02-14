import { Capacitor, registerPlugin } from '@capacitor/core';
import type { InitializeOptions, GoogleOneTapAuthPlugin, SignInResult, SignOutResult, RenderSignInButtonOptions } from './definitions';
import { assert, randomHexString } from './helpers';
import { GoogleOneTapAuthWeb } from './web';

const GoogleOneTapAuthPlatform = registerPlugin<GoogleOneTapAuthPlugin>('GoogleOneTapAuth', {
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

  tryAutoSignIn(): Promise<SignInResult> {
    assert(() => this.isInitialized, 'Must call and await initialize first.');
    return GoogleOneTapAuthPlatform.tryAutoSignIn();
  }

  signOut(): Promise<SignOutResult> {
    return GoogleOneTapAuthPlatform.signOut();
  }
  
  renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult> {
    assert(() => this.isInitialized, 'Must call and await initialize first.');
    options.webOptions = options.webOptions || {};
    if (Capacitor.getPlatform() === 'web') {
      return GoogleOneTapAuthPlatform.renderSignInButton(parentElementId, options, gsiButtonConfiguration);
    }
    (GoogleOneTapAuthPlatform as any).triggerGoogleSignIn(options);
    return Promise.resolve({ isSuccess: true });
  }

  getNonce() {
    assert(() => !!this.nonce, `The nonce is only set after ${() => this.initialize} was called.`);
    return this.nonce!;
  }
}

const googleOneTapAuth = new GoogleOneTapAuth();
export { googleOneTapAuth as GoogleOneTapAuth }