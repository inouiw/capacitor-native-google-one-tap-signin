import { WebPlugin } from '@capacitor/core';
import { GoogleOneTapAuthPlugin, WebInitOptions, User } from './definitions';

export class GoogleOneTapAuthWeb extends WebPlugin implements GoogleOneTapAuthPlugin {
  gapiLoaded: Promise<void>;
  options: WebInitOptions;

  constructor() {
    super();
  }

  loadScript() {
    if (typeof document === 'undefined') {
      return;
    }

    const scriptId = 'gapi';
    const scriptEl = document?.getElementById(scriptId);

    if (scriptEl) {
      return;
    }

    const head = document.getElementsByTagName('head')[0];
    const script = document.createElement('script');

    script.type = 'text/javascript';
    script.defer = true;
    script.async = true;
    script.id = scriptId;
    script.onload = this.platformJsLoaded.bind(this);
    script.src = 'https://apis.google.com/js/platform.js';
    head.appendChild(script);
  }

  initialize(
    _options: Partial<WebInitOptions> = {
      webClientId: '',
    }
  ) {
    if (typeof window === 'undefined') {
      return;
    }

    const metaClientId = (document.getElementsByName('google-signin-client_id')[0] as any)?.content;
    const webClientId = _options.webClientId || metaClientId || '';

    if (!webClientId) {
      console.warn('GoogleOneTapAuthPlugin - clientId is empty');
    }

    this.options = {
      webClientId,
    };

    this.gapiLoaded = new Promise((resolve) => {
      // HACK: Relying on window object, can't get property in gapi.load callback
      (window as any).gapiResolve = resolve;
      this.loadScript();
    });

    this.addUserChangeListener();
  }

  platformJsLoaded() {
    gapi.load('auth2', () => {
      const clientConfig: gapi.auth2.ClientConfig & { plugin_name: string } = {
        client_id: this.options.webClientId,
        plugin_name: 'CapacitorNativeGoogleOneTapSignin',
      };

      gapi.auth2.init(clientConfig);
      (window as any).gapiResolve();
    });
  }

  async signIn() {
    return new Promise<User>(async (resolve, reject) => {
      try {
        await gapi.auth2.getAuthInstance().signIn();

        const googleUser = gapi.auth2.getAuthInstance().currentUser.get();

        const user = this.getUserFrom(googleUser);
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  }

  async refresh() {
    const authResponse = await gapi.auth2.getAuthInstance().currentUser.get().reloadAuthResponse();
    return {
      accessToken: authResponse.access_token,
      idToken: authResponse.id_token,
      refreshToken: '',
    };
  }

  async signOut() {
    return gapi.auth2.getAuthInstance().signOut();
  }

  private async addUserChangeListener() {
    await this.gapiLoaded;
    gapi.auth2.getAuthInstance().currentUser.listen((googleUser) => {
      this.notifyListeners('userChange', googleUser.isSignedIn() ? this.getUserFrom(googleUser) : null);
    });
  }

  private getUserFrom(googleUser: gapi.auth2.GoogleUser) {
    const user = {} as User;
    const profile = googleUser.getBasicProfile();

    // user.email = profile.getEmail();
    // user.familyName = profile.getFamilyName();
    // user.givenName = profile.getGivenName();
    user.id = profile.getId();
    // user.imageUrl = profile.getImageUrl();
    // user.name = profile.getName();

    //const authResponse = googleUser.getAuthResponse(true);
    // user.authentication = {
    //   accessToken: authResponse.access_token,
    //   idToken: authResponse.id_token,
    //   refreshToken: '',
    // };

    return user;
  }
}
