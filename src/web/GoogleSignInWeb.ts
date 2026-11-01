import { WebPlugin } from '@capacitor/core';
import { cancel, disableAutoSelect, loadGis, renderButton, revoke, signIn } from '@madauth/google-identity';
import type { CredentialResult, GsiButtonConfiguration, NoCredential } from '@madauth/google-identity';

import type { InitializeOptions, SignOutResult, RenderSignInButtonOptions, DisconnectResult } from '../definitions';
import type { NotEnrichedSignInResultOption } from '../definitionsInternal';

/**
 * Web platform specific implementation of the Google One Tap Auth plugin, on @madauth/google-identity:
 * the browser's FedCM dialog where the browser has it, Google One Tap and Google's button otherwise.
 * Called from @see {@link GoogleSignIn}
 */
export class GoogleOneTapAuthWeb extends WebPlugin {
  initializeOptions?: InitializeOptions;

  async initialize(options: InitializeOptions): Promise<void> {
    this.initializeOptions = options;
    // Pre-loads Google's script, which the button and browsers without FedCM need. If it fails, a sign-in says so (load_failed).
    loadGis().catch(() => undefined);
  }

  async tryAutoOrOneTapSignIn(): Promise<NotEnrichedSignInResultOption> {
    let result = await this.signIn(true);
    // If the user cancelled, do not ask again.
    if (!result.isSuccess && result.reason !== 'cancelled') {
      result = await this.signIn(false);
    }
    return toSignInResultOption(result);
  }

  async tryOneTapSignIn(): Promise<NotEnrichedSignInResultOption> {
    return toSignInResultOption(await this.signIn(false));
  }

  async tryAutoSignIn(): Promise<NotEnrichedSignInResultOption> {
    return toSignInResultOption(await this.signIn(true));
  }

  signInWithGoogleButtonFlowForNativePlatform(): Promise<NotEnrichedSignInResultOption> {
    return Promise.reject('signInWithGoogleButtonFlowForNativePlatform: For the web platform, the sign-in with Google button flow cannot be triggered by an API call but only by pressing a button.');
  }

  /** Renders Google's button into the element and resolves with the first sign-in through it. */
  renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: GsiButtonConfiguration): Promise<NotEnrichedSignInResultOption> {
    return new Promise<NotEnrichedSignInResultOption>((resolve) => {
      void renderButton(document.getElementById(parentElementId)!, {
        clientId: this.initializeOptions!.clientId,
        nonce: this.initializeOptions!.nonce!,
        button: gsiButtonConfiguration,
        uxMode: options.webOptions?.uxMode,
        onCredential: (credential) => resolve(toSignInResultOption({ isSuccess: true, ...credential })),
      }).then((rendered) => {
        if (!rendered.isSuccess) {
          resolve(toSignInResultOption(rendered));
        }
      });
    });
  }

  cancelOneTapDialog(): void {
    cancel();
  }

  async signOut(_authenticatedUserId: string | undefined): Promise<SignOutResult> {
    disableAutoSelect();
    return { isSuccess: true };
  }

  async disconnect(authenticatedUserId: string | undefined): Promise<DisconnectResult> {
    if (!authenticatedUserId) {
      return { isSuccess: true };
    }
    return revoke(authenticatedUserId);
  }

  private signIn(autoSelect: boolean): Promise<CredentialResult> {
    return signIn({
      clientId: this.initializeOptions!.clientId,
      nonce: this.initializeOptions!.nonce!,
      autoSelect,
      // Same as the browser's FedCM dialog.
      cancelOnTapOutside: false,
    });
  }
}

/** Maps the package's result to the plugin's: `cancelled` is SIGN_IN_CANCELLED, other reasons keep their names. */
function toSignInResultOption(result: CredentialResult | ({ isSuccess: false } & NoCredential)): NotEnrichedSignInResultOption {
  if (result.isSuccess) {
    return { isSuccess: true, success: { idToken: result.idToken, isAutoSelected: result.isAutoSelected } };
  }
  return {
    isSuccess: false,
    noSuccess: {
      noSuccessReasonCode: result.reason === 'cancelled' ? 'SIGN_IN_CANCELLED' : result.reason,
      noSuccessAdditionalInfo: result.detail,
    },
  };
}
