import { Capacitor, registerPlugin } from '@capacitor/core';
import type { InitializeOptions, GoogleOneTapAuthPlugin, SignInResultPromises, SuccessSignInResult, SignOutResult, RenderSignInButtonOptions, NoSuccessSignInResult, SignInResultOption } from './definitions';
import { assert, randomHexString } from './helpers';
import { GoogleOneTapAuthWeb } from './web';
import { jwtDecode } from "jwt-decode";
import type { NotEnrichedSuccessSignInResult, NotEnrichtedSignInResultOption } from './definitionsInternal';

const GoogleOneTapAuthPlatform = registerPlugin<GoogleOneTapAuthWeb>('GoogleOneTapAuth', {
  web: () => new GoogleOneTapAuthWeb(),
});

enum InitializeStatus { NotInitialized, Initializing, Initialized }

// This file is the entry point for all plugin methods. It contains common logic to web, android, iOS or delegates to the specific implementation.
class GoogleOneTapAuth implements GoogleOneTapAuthPlugin {
  private nonce?: string;
  private initializeStatus = InitializeStatus.NotInitialized;
  private isInitializedPromise: Promise<void>;
  private resolveIsInitializedPromise: (() => void) | undefined;
  private authenticatedUserId?: string = undefined;

  constructor() {
    this.isInitializedPromise = new Promise<void>((resolve) => {
      this.resolveIsInitializedPromise = resolve;
    });
  }

  /// Performs common or one-time initialization. Can be called multiple times.
  initialize(options: InitializeOptions): Promise<void> {
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
    return this.isInitializedPromise;
  }

  private async ensureInitialized() {
    assert(() => this.initializeStatus !== InitializeStatus.NotInitialized, 'Must call initialize first.');
    if (this.initializeStatus === InitializeStatus.Initializing) {
      await this.isInitializedPromise;
    }
  }

  async tryAutoOrOneTapSignIn(): Promise<SignInResultPromises> {
    await this.ensureInitialized();
    const signInResultOptionPromise = GoogleOneTapAuthPlatform.tryAutoOrOneTapSignIn();
    const notEnrichtedSignInResultOption = (await signInResultOptionPromise) as NotEnrichtedSignInResultOption;
    const enrichtedSignInResultOption = this.enrichOptionResultWithDecodedIdToken(notEnrichtedSignInResultOption);

    if (enrichtedSignInResultOption.isSuccess) {
      this.authenticatedUserId = enrichtedSignInResultOption.success!.userId;
      return {
        successPromise: Promise.resolve(enrichtedSignInResultOption.success!),
        noSuccess: new Promise<NoSuccessSignInResult>(() => { }),
        signInResultOptionPromise: Promise.resolve(enrichtedSignInResultOption)
      };
    } else {
      return {
        successPromise: new Promise<SuccessSignInResult>(() => { }),
        noSuccess: Promise.resolve(enrichtedSignInResultOption.noSuccess!),
        signInResultOptionPromise: Promise.resolve(enrichtedSignInResultOption)
      };
    }
  }

  async signOut(): Promise<SignOutResult> {
    const result = await (GoogleOneTapAuthPlatform as any).signOut(this.authenticatedUserId);
    this.authenticatedUserId = undefined;
    return result;
  }

  async addSignInActionToExistingButton(buttonParentId: string, buttonId: string): Promise<SuccessSignInResult> {
    await this.ensureInitialized();
    const buttonParentElem = document.getElementById(buttonParentId);
    const buttonElem = document.getElementById(buttonId);
    assert(() => !!buttonParentElem);
    assert(() => !!buttonElem);

    if (Capacitor.getPlatform() === 'web') {
      buttonParentElem!.style.position = 'relative';
      buttonParentElem!.style.overflow = 'hidden';
      // buttonParentElem!.style.border = '2px solid red';  // uncomment for debugging

      // The visible button width should be the same as the google button width.
      const buttonElemWidth = buttonElem!.offsetWidth;
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

      return await this._doRenderSignInButton(invisibleGoogleButtonDivId, {}, { width: buttonElemWidth }, buttonElem!);
    } else {
      return await this._doRenderSignInButton(buttonParentId, {}, {}, buttonElem!);
    }
  }

  async renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SuccessSignInResult> {
    const androidAndIosButtonElem = this.getSignInButtonHtml(gsiButtonConfiguration)
    return this._doRenderSignInButton(parentElementId, options, gsiButtonConfiguration, androidAndIosButtonElem);
  }

  async _doRenderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration: google.GsiButtonConfiguration | undefined, androidAndIosButtonElem: HTMLElement): Promise<SuccessSignInResult> {
    await this.ensureInitialized();
    const parentElem = document.getElementById(parentElementId);
    assert(() => !!parentElem);
    options.webOptions = options.webOptions || {};

    return new Promise<SuccessSignInResult>(async (resolve, reject) => {
      try {
        if (Capacitor.getPlatform() === 'web') {
          const notEnrichedSuccessSignInResult = await GoogleOneTapAuthPlatform.renderSignInButton(parentElementId, options, gsiButtonConfiguration);
          const enrichtedSuccessSignInResult = this.enrichSuccessResultWithDecodedIdToken(notEnrichedSuccessSignInResult);
          this.authenticatedUserId = enrichtedSuccessSignInResult.userId;
          resolve(enrichtedSuccessSignInResult);
          return;
        }

        const onClickAction = async () => {
          try {
            const notEnrichedSuccessSignInResult: SignInResultOption = await (GoogleOneTapAuthPlatform as any).triggerGoogleSignIn(options);
            if (notEnrichedSuccessSignInResult.isSuccess) {
              const enrichtedSuccessSignInResult = this.enrichSuccessResultWithDecodedIdToken(notEnrichedSuccessSignInResult.success!);
              this.authenticatedUserId = enrichtedSuccessSignInResult.userId;
              resolve(enrichtedSuccessSignInResult);
            }
            else {
              if (notEnrichedSuccessSignInResult.noSuccess?.noSuccessReasonCode === 'SIGN_IN_CANCELLED') {
                // console.log('User cancelled sign in. Waiting for next sign in attempt.');
              }
            }
          } catch (e) {
            reject(e);
          }
        };
        androidAndIosButtonElem.onclick = onClickAction;
        parentElem!.appendChild(androidAndIosButtonElem);
      }
      catch (e) {
        reject(e);
      }
    });
  }

  getNonce() {
    assert(() => !!this.nonce, `The nonce is only set after ${() => this.initialize} was called.`);
    return this.nonce!;
  }

  private enrichOptionResultWithDecodedIdToken(signInResultOption: NotEnrichtedSignInResultOption): SignInResultOption {
    if (signInResultOption.isSuccess === false) {
      return signInResultOption as SignInResultOption;
    }
    return {
      ...signInResultOption,
      success: this.enrichSuccessResultWithDecodedIdToken(signInResultOption.success!),
    } as SignInResultOption;
  }

  private enrichSuccessResultWithDecodedIdToken(successSignInResult: NotEnrichedSuccessSignInResult): SuccessSignInResult {
    const decodedJwt = jwtDecode(successSignInResult.idToken) as any;
    return {
      ...successSignInResult,
      decodedIdToken: decodedJwt,
      userId: decodedJwt.sub,
      email: decodedJwt.email,
    } as SuccessSignInResult;
  }

  private getSignInButtonHtml(gsiButtonConfiguration?: google.GsiButtonConfiguration) {
    // Note: Replacing double quotes with single quotes will break some strings.
    const localizedStrings = {
      en: { signin: 'Sign in', continue_with: 'Continue with Google', signin_with: 'Sign in with Google', signup_with: 'Sign up with Google' },
      ar: { signin: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', continue_with: '\u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google', signin_with: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google', signup_with: '\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0646 \u062e\u0644\u0627\u0644 Google' },
      sr: { signin: '\u041f\u0440\u0438\u0458\u0430\u0432\u0438 \u043c\u0435', continue_with: '\u041d\u0430\u0441\u0442\u0430\u0432\u0438\u0442\u0435 \u0441\u0430 Google-\u043e\u043c', signin_with: '\u041f\u0440\u0438\u0458\u0430\u0432\u0438\u0442\u0435 \u0441\u0435 \u043f\u043e\u043c\u043e\u045b\u0443 Google-\u0430', signup_with: '\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0443\u0458\u0442\u0435 \u0441\u0435 \u043f\u043e\u043c\u043e\u045b\u0443 Google-\u0430' },
      nb: { signin: 'Logg p\u00e5', continue_with: 'Fortsett med Google', signin_with: 'Logg p\u00e5 med Google', signup_with: 'Registrer deg med Google' },
      pl: { signin: 'Zaloguj si\u0119', continue_with: 'Kontynuuj przy u\u017cyciu konta Google', signin_with: 'Zaloguj si\u0119 przez Google', signup_with: 'Zarejestruj si\u0119 przez Google' },
      vi: { signin: '\u0110\u0103ng nh\u1eadp', continue_with: 'Ti\u1ebfp t\u1ee5c truy c\u1eadp Google', signin_with: '\u0110\u0103ng nh\u00e2\u0323p b\u0103\u0300ng Google', signup_with: '\u0110\u0103ng k\u00fd b\u1eb1ng Google' },
      cs: { signin: 'P\u0159ihl\u00e1sit se', continue_with: 'Pokra\u010dovat pomoc\u00ed Googlu', signin_with: "P\u0159ihl\u00e1sit se p\u0159es Google", signup_with: 'Registrace pomoc\u00ed Googlu' },
      id: { signin: 'Login', continue_with: 'Lanjutkan dengan Google', signin_with: 'Login dengan Google', signup_with: 'Daftar dengan Google' },
      nl: { signin: 'Inloggen', continue_with: 'Doorgaan met Google', signin_with: 'Inloggen met Google', signup_with: 'Aanmelden bij Google' },
      gl: { signin: 'Iniciar sesi\u00f3n', continue_with: 'Continuar con Google', signin_with: 'Iniciar sesi\u00f3n con Google', signup_with: 'Iniciar sesi\u00f3n con Google' },
      sv: { signin: 'Logga in', continue_with: 'Forts\u00e4tt med Google', signin_with: 'Logga in med Google', signup_with: 'Registrera dig med Google' },
      lv: { signin: 'Pierakst\u012b\u0161an\u0101s', continue_with: 'Turpin\u0101t darbu ar Google', signin_with: 'Pierakstieties ar Google', signup_with: 'Re\u0123istr\u0113\u0161an\u0101s, izmantojot Google' },
      tr: { signin: 'Oturum a\u00e7\u0131n', continue_with: 'Google ile devam edin', signin_with: 'Google ile oturum a\u00e7\u0131n', signup_with: 'Google ile kaydolun' },
      it: { signin: 'Accedi', continue_with: 'Continua con Google', signin_with: 'Accedi con Google', signup_with: 'Registrati con Google' },
      sq: { signin: 'Identifikohu', continue_with: 'Vazhdo me Google', signin_with: 'Identifikohu me Google', signup_with: 'Regjistrohu me Google' },
      ro: { signin: 'Conecteaz\u0103-te', continue_with: 'Continu\u0103 cu Google', signin_with: 'Conecteaz\u0103-te cu Google', signup_with: '\u00censcrie-te cu Google' },
      de: { signin: 'Anmelden', continue_with: 'Weiter mit Google', signin_with: '\u00dcber Google anmelden', signup_with: 'Mit Google anmelden' },
      ko: { signin: '\ub85c\uadf8\uc778', continue_with: 'Google \uacc4\uc815\uc73c\ub85c \uacc4\uc18d\ud558\uae30', signin_with: 'Google \uacc4\uc815\uc73c\ub85c \ub85c\uadf8\uc778', signup_with: 'Google \uacc4\uc815\uc73c\ub85c \uac00\uc785\ud558\uae30' },
      fr: { signin: 'Se connecter', continue_with: 'Continuer avec Google', signin_with: 'Se connecter avec Google', signup_with: "S'inscrire avec Google" },
      kmr: { signin: 'Oturum a\u00e7\u0131n', continue_with: 'Google ile devam edin', signin_with: 'Google ile oturum a\u00e7\u0131n', signup_with: 'Google ile kaydolun' },
      zh: { signin: '\u767b\u5f55', continue_with: '\u901a\u8fc7 Google \u7ee7\u7eed\u64cd\u4f5c', signin_with: "\u4f7f\u7528 Google \u5e10\u53f7\u767b\u5f55", signup_with: '\u4f7f\u7528 Google \u5e10\u53f7\u6ce8\u518c' },
      'zh-CN': { signin: '\u767b\u5f55', continue_with: '\u901a\u8fc7 Google \u7ee7\u7eed\u64cd\u4f5c', signin_with: "\u4f7f\u7528 Google \u5e10\u53f7\u767b\u5f55", signup_with: '\u4f7f\u7528 Google \u5e10\u53f7\u6ce8\u518c' },
      'zh-HK': { signin: '\u767b\u5165', continue_with: '\u7e7c\u7e8c\u900f\u904e Google \u5e33\u6236\u64cd\u4f5c', signin_with: '\u4f7f\u7528 Google \u5e33\u6236\u767b\u5165', signup_with: '\u4f7f\u7528 Google \u5e33\u6236\u8a3b\u518a' },
      pt: { signin: 'Fazer login', continue_with: 'Continuar com o Google', signin_with: 'Fazer login com o Google', signup_with: 'Inscrever-se no Google' },
      es: { signin: 'Iniciar sesi\u00f3n', continue_with: 'Continuar con Google', signin_with: 'Iniciar sesi\u00f3n con Google', signup_with: 'Registrarse con Google' },
    } as any;
    const locale = gsiButtonConfiguration?.locale;
    let localeTexts = locale !== undefined && locale in localizedStrings ? (localizedStrings[locale]) : undefined;

    if (localeTexts === undefined) {
      const countryCode = locale?.includes('-') === true ? locale.split('-')[1] : (locale ?? '');
      localeTexts = countryCode in localizedStrings ? (localizedStrings[countryCode] as string) : localizedStrings['en'];
    }
    const text = gsiButtonConfiguration?.text ?? 'signin_with';
    const buttonText = localeTexts[text];

    // HTML from https://github.com/inouiw/ReactSignInWithGoogleButton
    const button = document.createElement('button');
    button.setAttribute("style", "border-radius: 4px; background-color: rgb(255, 255, 255); border: 1px solid rgb(218, 220, 224); color: rgb(60, 64, 67); cursor: pointer; font-family: Roboto, Verdana; font-weight: 500; font-size: 14px; height: 40px; letter-spacing: 0.25px; padding: 0px 12px; position: relative; text-align: center; vertical-align: middle; width: auto;");
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
        <p>${buttonText}</p>
      </div>`;
    return button;
  }
}

const googleOneTapAuth = new GoogleOneTapAuth();
export { googleOneTapAuth as GoogleOneTapAuth }