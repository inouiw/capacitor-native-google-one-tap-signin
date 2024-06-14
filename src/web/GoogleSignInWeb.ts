import { WebPlugin } from '@capacitor/core';
import { InitializeOptions, SignOutResult, RenderSignInButtonOptions, SuccessSignInResult, NoSuccessSignInResult } from '../definitions';
import type { NotEnrichedSignInResultOption } from '../definitionsInternal';
import * as  GoogleIdentityServicesClient from './GoogleIdentityServicesClient';
import * as  FedCMAuthClient from './FedCMAuthClient';
import { IAuthClient } from './IAuthClient';
import { toNotEnrichedSignInResultOption } from '../helpers';

/*
 * Web platform specific implementation of the Google One Tap Auth plugin.
 * Called from @see {@link GoogleSignIn}
 */
export class GoogleOneTapAuthWeb extends WebPlugin {
  initializeOptions?: InitializeOptions = undefined;
  authClient?: IAuthClient = undefined;

  async initialize(options: InitializeOptions): Promise<void> {
    this.initializeOptions = options;

    if (FedCMAuthClient.isFedCMSupported()) {
      this.authClient = FedCMAuthClient;
    } else {
      this.authClient = GoogleIdentityServicesClient;
    }
    return GoogleIdentityServicesClient.initialize();
  }

  async tryAutoOrOneTapSignIn(): Promise<NotEnrichedSignInResultOption> {
    let signInResult = await this.authClient!.signIn(true, this.initializeOptions!.clientId!, this.initializeOptions!.nonce);

    if (!(signInResult as SuccessSignInResult).idToken
      // If the popup was cancelled, do not show it again.
      && (signInResult as NoSuccessSignInResult).noSuccessReasonCode !== 'SIGN_IN_CANCELLED') {
      
      signInResult = await this.authClient!.signIn(false, this.initializeOptions!.clientId!, this.initializeOptions!.nonce);
    }
    return toNotEnrichedSignInResultOption(signInResult);
  }

  async tryOneTapSignIn(): Promise<NotEnrichedSignInResultOption> {
    let signInResult = await this.authClient!.signIn(false, this.initializeOptions!.clientId!, this.initializeOptions!.nonce);
    return toNotEnrichedSignInResultOption(signInResult);
  }

  async tryAutoSignIn(): Promise<NotEnrichedSignInResultOption> {
    let signInResult = await this.authClient!.signIn(true, this.initializeOptions!.clientId!, this.initializeOptions!.nonce);
    return toNotEnrichedSignInResultOption(signInResult);
  }

  async renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.accounts.id.GsiButtonConfiguration): Promise<NotEnrichedSignInResultOption> {
    let signInResult = await GoogleIdentityServicesClient.renderSignInButton(this.initializeOptions!.clientId!, this.initializeOptions!.nonce, parentElementId, options, gsiButtonConfiguration);
    return toNotEnrichedSignInResultOption(signInResult);
  }

  cancelOneTapDialog(): void {
    this.authClient!.cancel();
  }

  signOut(authenticatedUserId: string | undefined): Promise<SignOutResult> {
    return this.authClient!.signOut(authenticatedUserId);
  }
}