// This file is the entry point for all plugin methods. It contains common logic to web, android, iOS or delegates to the specific implementation.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { GsiButtonConfiguration } from 'google-one-tap';
import type { GoogleOneTapAuthPlugin, SignInOptions, SignInResult, SignOutResult } from './definitions';
import { GoogleOneTapAuthWeb } from './web';

const GoogleOneTapAuthPlatform = registerPlugin<GoogleOneTapAuthPlugin>('GoogleOneTapAuth', {
  web: () => new GoogleOneTapAuthWeb(),
});

class GoogleOneTapAuth implements GoogleOneTapAuthPlugin {
  initialize(): Promise<void> {
    return GoogleOneTapAuthPlatform.initialize();
  }

  tryAutoSignIn(options: SignInOptions): Promise<SignInResult> {
    return GoogleOneTapAuthPlatform.tryAutoSignIn(options);
  }

  trySignInWithPrompt(options: SignInOptions): Promise<SignInResult> {
    return GoogleOneTapAuthPlatform.trySignInWithPrompt(options);
  }

  tryAutoSignInThenTrySignInWithPrompt(options: SignInOptions): Promise<SignInResult> {
    return GoogleOneTapAuthPlatform.tryAutoSignInThenTrySignInWithPrompt(options);
  }

  signOut(): Promise<SignOutResult> {
    return GoogleOneTapAuthPlatform.signOut();
  }
  
  renderButton(parentElementId: string, options: SignInOptions, gsiButtonConfiguration?: GsiButtonConfiguration): Promise<SignInResult> {
    if (Capacitor.getPlatform() === 'web') {
      return GoogleOneTapAuthPlatform.renderButton(parentElementId, options, gsiButtonConfiguration);
    }
    return Promise.resolve({ isSuccess: true });
  }
}

const googleOneTapAuth = new GoogleOneTapAuth();
export { googleOneTapAuth as GoogleOneTapAuth }