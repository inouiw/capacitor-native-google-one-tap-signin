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
      parentElem!.appendChild(this._getSignInButtonHtml(onClickAction, gsiButtonConfiguration?.locale));
    });
  }

  getNonce() {
    assert(() => !!this.nonce, `The nonce is only set after ${() => this.initialize} was called.`);
    return this.nonce!;
  }

  _getSignInButtonHtml(onClickAction: () => any, locale?: string) {
    // Source: Search on github for any of the localized strings.
    const localizedStrings = {
      en: { sign_in: 'Sign in', continue_with: 'Continue with Google', signin_with: 'Sign in with Google' }, // "";break;case 3:b+="Sign up with Google";break;case 4:b+="Continue with Google";
      ar: { sign_in: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', continue_with: '', signin_with: 'Sign in with Google', signup_with: 'التسجيل بواسطة Google' }, // "";break;case 3:b+="\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0645\u0646 \u062e\u0644\u0627\u0644 Google";break;case 4:b+="\u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google";break;default:b+="\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 Google"}return b
      sr: { sign_in: '\u041f\u0440\u0438\u0458\u0430\u0432\u0438 \u043c\u0435', continue_with: 'Настави са Google-ом', signin_with: ''  }, // "";break;case 3:b+="\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0443\u0458\u0442\u0435 \u0441\u0435 \u043f\u043e\u043c\u043e\u045b\u0443 Google-\u0430";break;case 4:b+="\u041d\u0430\u0441\u0442\u0430\u0432\u0438\u0442\u0435 \u0441\u0430 Google-\u043e\u043c";break;default:b+="\u041f\u0440\u0438\u0458\u0430\u0432\u0438\u0442\u0435 \u0441\u0435 \u043f\u043e\u043c\u043e\u045b\u0443 Google-\u0430"}return b
      nb: { sign_in: 'Logg p\u00e5', continue_with: 'Fortsett med Google', signin_with: ''  }, // "";break;case 3:b+="Registrer deg med Google";break;case 4:b+="Fortsett med Google";break;default:b+="Logg p\u00e5 med Google"}return b}
      pl: { sign_in: 'Zaloguj si\u0119', continue_with: 'Zaloguj się za pośrednictwem Google', signin_with: ''  }, // "";break;case 3:b+="Zarejestruj si\u0119 przez Google";break;case 4:b+="Kontynuuj przy u\u017cyciu konta Google";break;default:b+="Zaloguj si\u0119 przez Google"}return b}
      vi: { sign_in: '\u0110\u0103ng nh\u1eadp', continue_with: 'Tiếp tục với Google', signin_with: ''  }, // "";break;case 3:b+="\u0110\u0103ng k\u00fd b\u1eb1ng Google";break;case 4:b+="Ti\u1ebfp t\u1ee5c truy c\u1eadp Google";break;default:b+="\u0110\u0103ng nh\u00e2\u0323p b\u0103\u0300ng Google"}return b}
      cs: { sign_in: 'P\u0159ihl\u00e1sit se', continue_with: 'Pokračovat s Google', signin_with: ''  }, // "";break;case 3:b+="Registrace pomoc\u00ed Googlu";break;case 4:b+="Pokra\u010dovat pomoc\u00ed Googlu";break;default:b+="P\u0159ihl\u00e1sit se p\u0159es Google"}return b}
      id: { sign_in: 'Login', continue_with: 'Lanjutkan dengan Google', signin_with: '' }, // "";break;case 3:b+="Daftar dengan Google";break;case 4:b+="Lanjutkan dengan Google";break;default:b+="Login dengan Google"}return b
      nl: { sign_in: 'Inloggen', continue_with: 'Doorgaan met Google', signin_with: ''  }, // "";break;case 3:b+="Aanmelden bij Google";break;case 4:b+="Doorgaan met Google";break;default:b+="Inloggen met Google"
      gl: { sign_in: 'Iniciar sesi\u00f3n', continue_with: 'Continuar con Google', signin_with: ''  }, // "";break;case 3:b+="Iniciar sesi\u00f3n con Google";break;case 4:b+="Continuar con Google";break;default:b+="Iniciar sesi\u00f3n con Google"}return b}
      sv: { sign_in: 'Logga in', continue_with: 'Fortsätt med Google', signin_with: ''  }, // "";break;case 3:b+="Registrera dig med Google";break;case 4:b+="Forts\u00e4tt med Google";break;default:b+="Logga in med Google"}return b
      lv: { sign_in: 'Pierakst\u012b\u0161an\u0101s', continue_with: 'Turpiniet ar Google', signin_with: ''  }, // "";break;case 3:b+="Re\u0123istr\u0113\u0161an\u0101s, izmantojot Google";break;case 4:b+="Turpin\u0101t darbu ar Google";break;default:b+="Pierakstieties ar Google"}return b}
      tr: { sign_in: 'Oturum a\u00e7\u0131n', continue_with: 'Google ile devam et', signin_with: ''  }, // "";break;case 3:b+="Google ile kaydolun";break;case 4:b+="Google ile devam edin";break;default:
      it: { sign_in: 'Accedi', continue_with: 'Continua con Google', signin_with: 'Accedi con Google', signup_with: 'Si iscriva a Google' }, // "";break;case 3:b+="Registrati con Google";break;case 4:b+="Continua con Google";break;default:b+="Accedi con Google"}return b
      sq: { sign_in: 'Identifikohu', continue_with: 'Vazhdoni me Google', signin_with: ''  }, // "";break;case 3:b+="Regjistrohu me Google";break;case 4:b+="Vazhdo me Google";break;default:b+="Identifikohu me Google"}return b}
      ro: { sign_in: 'Conecteaz\u0103-te', continue_with: 'Continuă cu Google', signin_with: ''  }, // "";break;case 3:b+="\u00censcrie-te cu Google";break;case 4:b+="Continu\u0103 cu Google";break;default:b+="Conecteaz\u0103-te cu Google"}return b}
      de: { sign_in: 'Anmelden', continue_with: 'Weiter mit Google', signin_with: 'Mit Google anmelden'  }, // ;break;case 3:b+="Mit Google anmelden";break;case 4:b+="Weiter mit Google";break;default:b+="\u00dcber Google anmelden"}return b
      ko: { sign_in: '\ub85c\uadf8\uc778', continue_with: 'Google로 계속하기', signin_with: ''  }, // "";break;case 3:b+="Google \uacc4\uc815\uc73c\ub85c \uac00\uc785\ud558\uae30";break;case 4:b+="Google \uacc4\uc815\uc73c\ub85c \uacc4\uc18d\ud558\uae30";break;default:b+="Google \uacc4\uc815\uc73c\ub85c \ub85c\uadf8\uc778"}return b}
      fr: { sign_in: 'Se connecter', continue_with: 'Continuer avec Google', signin_with: 'Connexion avec Google'  }, // "";break;case 3:b+="S'inscrire avec Google";break;case 4:b+="Continuer avec Google";break;default:b+="Se connecter avec Google"}return b
      kmr: { sign_in: 'Oturum a\u00e7\u0131n', continue_with: 'Bi Googleê re dewam bike', signin_with: ''  }, // "";break;case 3:b+="Google ile kaydolun";break;case 4:b+="Google ile devam edin";break;default:b+="Google ile oturum a\u00e7\u0131n"}return b
      zh: { sign_in: '\u767b\u5f55', continue_with: '继续使用 Google', signin_with: ''  }, // "";break;case 3:b+="\u4f7f\u7528 Google \u5e10\u53f7\u6ce8\u518c";break;case 4:b+="\u901a\u8fc7 Google \u7ee7\u7eed\u64cd\u4f5c";break;default:b+="\u4f7f\u7528 Google \u5e10\u53f7\u767b\u5f55"}return b
      'zh-CN': { sign_in: '\u767b\u5f55', continue_with: '继续使用 Google', signin_with: ''  }, // same as above
      'zh-HK': { sign_in: '\u767b\u5165', continue_with: '繼續使用 Google', signin_with: ''  }, // "";break;case 3:b+="\u4f7f\u7528 Google \u5e33\u6236\u8a3b\u518a";break;case 4:b+="\u7e7c\u7e8c\u900f\u904e Google \u5e33\u6236\u64cd\u4f5c";break;default:b+="\u4f7f\u7528 Google \u5e33\u6236\u767b\u5165"}return b
      pt: { sign_in: 'Fazer login', continue_with: 'Continuar com Google', signin_with: 'Login com o Google'  }, // "";break;case 3:b+="Inscrever-se no Google";break;case 4:b+="Continuar com o Google";break;default:b+="Fazer login com o Google"}return b
      es: { sign_in: 'Iniciar sesi\u00f3n', continue_with: 'Continuar con Google', signin_with: 'Entrar con Google'  }, // "";break;case 3:b+="Registrarse con Google";break;case 4:b+="Continuar con Google";break;default:b+="Iniciar sesi\u00f3n con Google"}return b
    } as any;
    const countryCode = locale?.includes('-') === true ? locale.split('-')[1] : (locale ?? 'en');
    const buttonText = countryCode in localizedStrings ? (localizedStrings[countryCode] as string) : 'Continue with Google';
    // HTML from https://github.com/inouiw/ReactSignInWithGoogleButton
    const button = document.createElement('button');
    button.setAttribute("style", "border-radius: 4px; background-color: rgb(255, 255, 255); border: 1px solid rgb(218, 220, 224); color: rgb(60, 64, 67); cursor: pointer; font-family: Roboto, Verdana; font-weight: 500; font-size: 14px; height: 40px; letter-spacing: 0.25px; padding: 0px 12px; position: relative; text-align: center; vertical-align: middle; width: auto;");
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
        <p>${buttonText}Sign in with Google</p>
      </div>`;
    return button;
  }
}

const googleOneTapAuth = new GoogleOneTapAuth();
export { googleOneTapAuth as GoogleOneTapAuth }