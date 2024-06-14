import { Capacitor, registerPlugin } from '@capacitor/core';
import type { InitializeOptions, GoogleOneTapAuthPlugin, SuccessSignInResult, SignOutResult, RenderSignInButtonOptions, SignInResultOption } from './definitions';
import { assert, randomHexString } from './helpers';
import { GoogleOneTapAuthWeb } from './web/GoogleSignInWeb';
import { jwtDecode } from "jwt-decode";
import type { NotEnrichedSuccessSignInResult, NotEnrichedSignInResultOption } from './definitionsInternal';
import { createSignInButtonElement } from './SignInButtonElement'

const GoogleOneTapAuthPlatform = registerPlugin<GoogleOneTapAuthWeb>('GoogleOneTapAuth', {
  web: () => new GoogleOneTapAuthWeb(),
});

enum InitializeStatus { NotInitialized, Initializing, Initialized }

/* 
 * This file is the entry point for all plugin methods. It contains common logic to web, android, iOS or delegates to the specific implementation.
 */
class GoogleSignIn implements GoogleOneTapAuthPlugin {
  private nonce?: string;
  private initializeStatus = InitializeStatus.NotInitialized;
  private isInitializedPromise: Promise<void>;
  private resolveIsInitializedPromise: (() => void) | undefined;
  private rejectIsInitializedPromise: ((reason?: any) => void) | undefined;
  private authenticatedUserId?: string = undefined;

  constructor() {
    this.isInitializedPromise = new Promise<void>((resolve, reject) => {
      this.resolveIsInitializedPromise = resolve;
      this.rejectIsInitializedPromise = reject;
    });
  }

  /// Performs common or one-time initialization. Can be called multiple times.
  initialize(options: InitializeOptions): Promise<void> {
    try {
      if (this.initializeStatus === InitializeStatus.NotInitialized) {
        this.initializeStatus = InitializeStatus.Initializing;
        if (!options.clientId || options.clientId.endsWith("apps.googleusercontent.com") == false) {
          throw new Error("clientId must end with 'apps.googleusercontent.com' but is: " + options.clientId);
        }
        this.nonce = options.nonce = options.nonce || randomHexString(10);
        GoogleOneTapAuthPlatform.initialize(options).then(() => {
          this.initializeStatus = InitializeStatus.Initialized;
          this.resolveIsInitializedPromise!();
        });
      }
    }
    catch (e) {
      this.rejectIsInitializedPromise!((e as Error).message);
    }
    return this.isInitializedPromise;
  }

  private async ensureInitialized() {
    assert(() => this.initializeStatus !== InitializeStatus.NotInitialized, 'Must call initialize first.');
    if (this.initializeStatus === InitializeStatus.Initializing) {
      await this.isInitializedPromise;
    }
  }

  async tryAutoOrOneTapSignIn(): Promise<SignInResultOption> {
    return new Promise<SignInResultOption>(async (resolve) => {
      await this.withHandleError(resolve, async () => {
        await this.ensureInitialized();
        const notEnrichedSignInResultOption = await GoogleOneTapAuthPlatform.tryAutoOrOneTapSignIn();
        const enrichedSignInResultOption = this.enrichOptionResultWithDecodedIdToken(notEnrichedSignInResultOption);
        this.onResultReceived(enrichedSignInResultOption);
        resolve(enrichedSignInResultOption);
      });
    });
  }

  async tryAutoOrOneTapSignInWithCallback(onResult: (value: SignInResultOption) => void): Promise<void> {
    const signInResultOption = await this.tryAutoOrOneTapSignIn();
    onResult(signInResultOption);
  }

  async tryOneTapSignIn(): Promise<SignInResultOption> {
    return new Promise<SignInResultOption>(async (resolve) => {
      await this.withHandleError(resolve, async () => {
        await this.ensureInitialized();
        const notEnrichedSignInResultOption = await GoogleOneTapAuthPlatform.tryOneTapSignIn();
        const enrichedSignInResultOption = this.enrichOptionResultWithDecodedIdToken(notEnrichedSignInResultOption);
        this.onResultReceived(enrichedSignInResultOption);
        resolve(enrichedSignInResultOption);
      });
    });
  }

  async tryAutoSignIn(): Promise<SignInResultOption> {
    return new Promise<SignInResultOption>(async (resolve) => {
      await this.withHandleError(resolve, async () => {
        await this.ensureInitialized();
        const notEnrichedSignInResultOption = await GoogleOneTapAuthPlatform.tryAutoSignIn();
        const enrichedSignInResultOption = this.enrichOptionResultWithDecodedIdToken(notEnrichedSignInResultOption);
        this.onResultReceived(enrichedSignInResultOption);
        resolve(enrichedSignInResultOption);
      });
    });
  }

  private onResultReceived(signInResultOption: SignInResultOption) {
    if (signInResultOption.isSuccess) {
      this.authenticatedUserId = signInResultOption.success!.userId;
    }
  }

  cancelOneTapDialog(): void {
    (GoogleOneTapAuthPlatform as any).cancelOneTapDialog();
  }

  async signOut(): Promise<SignOutResult> {
    return new Promise<SignOutResult>(async (resolve) => {
      await this.withHandleError(resolve, async () => {
        const result = await (GoogleOneTapAuthPlatform as any).signOut(this.authenticatedUserId);
        this.authenticatedUserId = undefined;
        resolve(result);
      });
    });
  }

  // deprecated
  async renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.accounts.id.GsiButtonConfiguration,): Promise<SuccessSignInResult> {
    return new Promise<SuccessSignInResult>(async (resolve, reject) => {
      const resolveOnSuccess = (value: SignInResultOption) => {
        if (value.isSuccess) {
          resolve(value.success!);
        } else if (value.noSuccess!.noSuccessReasonCode === 'configuration_error') {
          reject(`configuration_error ${value.noSuccess!.noSuccessAdditionalInfo}`);
        }
      };
      await this.renderSignInButtonWithCallback(parentElementId, options, gsiButtonConfiguration, resolveOnSuccess);
    });
  }

  async renderSignInButtonWithCallback(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration: google.accounts.id.GsiButtonConfiguration | undefined, onResult: (value: SignInResultOption) => void): Promise<void> {
    await this.withHandleError(onResult, async () => {
      await this.ensureInitialized();
      const parentElem = document.getElementById(parentElementId);
      assert(() => !!parentElem);
      options.webOptions = options.webOptions || {};

      if (Capacitor.getPlatform() === 'web') {
        await this.renderSignInButtonUsingGoogleIdentityServicesForWeb(onResult, parentElementId, options, gsiButtonConfiguration);
      } else {
        await this.renderSignInButtonForNatitivePlatform(onResult, parentElem!, gsiButtonConfiguration);
      }
    });
  }

  private async renderSignInButtonUsingGoogleIdentityServicesForWeb(onResult: (value: SignInResultOption) => void, invisibleGoogleButtonDivId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration: google.accounts.id.GsiButtonConfiguration | undefined) {
    const notEnrichedSignInResultOption = await GoogleOneTapAuthPlatform.renderSignInButton(invisibleGoogleButtonDivId, options, gsiButtonConfiguration);
    const enrichedSignInResultOption = this.enrichOptionResultWithDecodedIdToken(notEnrichedSignInResultOption);
    this.onResultReceived(enrichedSignInResultOption);
    onResult(enrichedSignInResultOption);
  }

  private async renderSignInButtonForNatitivePlatform(onResult: (value: SignInResultOption) => void, parentElem: HTMLElement, gsiButtonConfiguration: google.accounts.id.GsiButtonConfiguration | undefined) {
    const androidOrIosButtonElem = createSignInButtonElement(gsiButtonConfiguration)
    this.addOnClickHandlerToExistingButtonForNatitivePlatform(androidOrIosButtonElem, onResult);
    parentElem.appendChild(androidOrIosButtonElem);
  }

  private addOnClickHandlerToExistingButtonForNatitivePlatform(androidOrIosButtonElem: HTMLElement, onResult: (value: SignInResultOption) => void) {
    const onClickAction = () => {
      this.withHandleError(onResult, async () => {
        const notEnrichedSuccessSignInResultOption: NotEnrichedSignInResultOption = await (GoogleOneTapAuthPlatform as any).triggerGoogleSignIn();
        if (notEnrichedSuccessSignInResultOption.isSuccess) {
          const enrichedSignInResultOption = this.enrichOptionResultWithDecodedIdToken(notEnrichedSuccessSignInResultOption);
          this.onResultReceived(enrichedSignInResultOption);
          onResult(enrichedSignInResultOption);
        }
        else {
          if (notEnrichedSuccessSignInResultOption.noSuccess?.noSuccessReasonCode === 'SIGN_IN_CANCELLED') {
            // console.log('User cancelled sign in. Waiting for next sign in attempt.');
          }
        }
      });
    };
    androidOrIosButtonElem.onclick = onClickAction;
  }

  // deprecated
  async addSignInActionToExistingButton(buttonParentId: string, buttonId: string): Promise<SuccessSignInResult> {
    return new Promise<SuccessSignInResult>(async (resolve, reject) => {
      const resolveOnSuccess = (value: SignInResultOption) => {
        if (value.isSuccess) {
          resolve(value.success!);
        } else if (value.noSuccess!.noSuccessReasonCode === 'configuration_error') {
          reject(`configuration_error ${value.noSuccess!.noSuccessAdditionalInfo}`);
        }
      };
      await this.addSignInActionToExistingButtonWithCallback(buttonParentId, buttonId, resolveOnSuccess);
    });
  }

  async addSignInActionToExistingButtonWithCallback(buttonParentId: string, buttonId: string, onResult: (value: SignInResultOption) => void): Promise<void> {
    await this.withHandleError(onResult, async () => {
      await this.ensureInitialized();

      const parentElem = document.getElementById(buttonParentId);
      const buttonElem = document.getElementById(buttonId);
      assert(() => !!parentElem);
      assert(() => !!buttonElem);

      if (Capacitor.getPlatform() === 'web') {
        await this.addSignInActionToExistingButtonForWeb(parentElem!, buttonElem!, onResult);
      } else {
        this.addOnClickHandlerToExistingButtonForNatitivePlatform(buttonElem!, onResult);
      }
    });
  }

  private async addSignInActionToExistingButtonForWeb(buttonParentElem: HTMLElement, buttonElem: HTMLElement, onResult: (value: SignInResultOption) => void): Promise<void> {
    buttonParentElem.style.position = 'relative';
    buttonParentElem.style.overflow = 'hidden';
    // buttonParentElem!.style.border = '2px solid red';  // uncomment for debugging

    // The visible button width should be the same as the google button width.
    const buttonElemWidth = await this.waitForElementOffsetWidthNotZero(buttonElem!);
    assert(() => buttonElemWidth !== 0);

    const invisibleGoogleButtonDiv = document.createElement('div');
    const invisibleGoogleButtonDivId = 'invisibleGoogleButtonDiv';
    invisibleGoogleButtonDiv.setAttribute('id', invisibleGoogleButtonDivId);
    invisibleGoogleButtonDiv.style.position = 'absolute';
    invisibleGoogleButtonDiv.style.top = '0px';
    invisibleGoogleButtonDiv.style.left = '0px';
    invisibleGoogleButtonDiv.style.width = `${buttonElemWidth}px`;
    invisibleGoogleButtonDiv.style.boxSizing = 'border-box';
    invisibleGoogleButtonDiv.style.opacity = '0.0001'; // change it for debugging
    buttonElem!.appendChild(invisibleGoogleButtonDiv);

    await this.renderSignInButtonUsingGoogleIdentityServicesForWeb(onResult, invisibleGoogleButtonDivId, {}, { type: 'standard', width: buttonElemWidth });
  }

  private waitForElementOffsetWidthNotZero(element: HTMLElement): Promise<number> {
    if (element.offsetWidth !== 0) {
      return Promise.resolve(element.offsetWidth);
    }
    return new Promise<number>((resolve) => {
      const resizeObserver = new ResizeObserver(() => {
        if (element.offsetWidth !== 0) {
          resolve(element.offsetWidth);
        }
      });
      resizeObserver.observe(element);
    });
  }

  getNonce() {
    assert(() => !!this.nonce, `The nonce is only set after ${() => this.initialize} was called.`);
    return this.nonce!;
  }

  private enrichOptionResultWithDecodedIdToken(signInResultOption: NotEnrichedSignInResultOption): SignInResultOption {
    if (signInResultOption.isSuccess === false) {
      return signInResultOption as SignInResultOption;
    }
    return {
      ...signInResultOption,
      success: this.enrichSuccessResultWithDecodedIdToken(signInResultOption.success!),
    } as SignInResultOption;
  }

  private enrichSuccessResultWithDecodedIdToken(successSignInResult: NotEnrichedSuccessSignInResult): SuccessSignInResult {
    try {
      const decodedJwt = jwtDecode(successSignInResult.idToken) as any;
      return {
        ...successSignInResult,
        decodedIdToken: decodedJwt,
        userId: decodedJwt.sub,
        email: decodedJwt.email,
      } as SuccessSignInResult;
    }
    catch (e) {
      throw new Error(`Failed to decode idToken: ${successSignInResult.idToken}. Error: ${(e as Error).message}`);
    }
  }

  // To run code and call onResult with a SignInResultOption with NoSuccessSignInResult in case of error. Uses an existing onResult callback that the caller must provide.
  private async withHandleError(onResult: (value: SignInResultOption) => void, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    }
    catch (e) {
      onResult({
        isSuccess: false,
        noSuccess: {
          noSuccessAdditionalInfo: (e as any).toString(),
        }
      });
    }
  }
}

const googleOneTapAuth = new GoogleSignIn();
export { googleOneTapAuth as GoogleOneTapAuth }
