# Capacitor Native Google One Tap Signin plugin

Wraps the native android One Tap api for ionic capacitor apps. One Tap Sign In is part of Sign in with Google and offers features as automatic sign-in on return visits.

This library intends to provide the best google authentication experience for each platform.

<img src="screenshots/one-tap-sign-in-demo-initial-sign-in.jpg" alt="One tap signin screenshot initial sign-in" width=250/>
<img src="screenshots/one-tap-sign-in-demo-sign-back-in.jpg" alt="One tap signin screenshot sign back in" width=250/>
<img src="screenshots/one-tap-sign-in-demo-without-filter-by-authorized-acounts.jpg" alt="One tap signin screenshot without filter by authorized accounts" width=250/>


After a successful authentication, the idToken is returned as base64 and as object.

The user is automatically signed-in, without a prompt after the first sign-in.

The android minSdkVersion is 24, however the one-tap library seems to require API version 29. For lower API versions GoogleSignIn is used.

# Install and Configure

#### 1. Install package

```sh
npm i --save capacitor-native-google-one-tap-signin
```

#### 2. Update capacitor dependencies

```sh
npx cap update
```

#### 3. Configure
Authentication is based on cryptographic keys, so you need to create a client ID for each platform in [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).

For the web platform, you need to create a client ID of type "Web application". When creating the client ID add two "Authorized JavaScript origins". One with URI "http://localhost:3000" and one with URI "http://localhost". "Authorized redirect URIs" is not needed. Copy the generated client ID and pass it in the `initialize` call. Note that if you host the app not on localhost or on a different port, you will either need to add more origins or add another client ID.

For the android platform, you need to create a client ID of type "Android", as stated in [One Tap Get started docu](https://developers.google.cn/identity/one-tap/android/get-started). You just need to create that client ID, you do not need to include it in any config. It is linked to your app via the package name and SHA-1 signing certificate fingerprint of your app. Note that usually the signing certificate for developments builds is different than for app store builds so you will need to create a client ID for development builds and one for app store builds.

For the ios platform, you need to create a client ID of type iOS in the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard). Add the client ID to the  `{your-app}/ios/App/App/Info.plist` file with the key `GIDClientID` (see the demo app for reference). When creating the client ID, you will see the "iOS URL scheme" value in the Google Cloud Console. Add this also to the `Info.plist` file.

# Usage

```TypeScript
import { GoogleOneTapAuth, SignInResult } from 'capacitor-native-google-one-tap-signin';

await GoogleOneTapAuth.initialize({ clientId: clientId });

// Example 1: Showing the button only if auto-sign-in or one-tap sign in fail.
const signInResult = await GoogleOneTapAuth.tryAutoOrOneTapSignIn()
  .then(res => res.signInResultOptionPromise);
if (signInResult.isSuccess) {
  console.log(signInResult);
} else { 
  const successResult = await GoogleOneTapAuth
    .renderSignInButton('google-signin', {}, { text: 'continue_with' });
  console.log(successResult);
}

// See the demo folder for an example application.
```

```TypeScript
import { GoogleOneTapAuth, SignInResult } from 'capacitor-native-google-one-tap-signin';

await GoogleOneTapAuth.initialize({ clientId: clientId });

// Example 2: Trigger auto-sign-in or one-tap sign and show the button in parallel.
const autoOrOneTapSuccessPromise = GoogleOneTapAuth.tryAutoOrOneTapSignIn()
  .then(res => res.successPromise);
const renderButtonPromise = GoogleOneTapAuth
  .renderSignInButton('google-signin', {}, { text: 'continue_with' });
const signInResultSuccess = await Promise.race([autoOrOneTapSuccessPromise, renderButtonPromise]);
console.log(signInResultSuccess);

// See the demo folder for an example application.
```

# Notes about testing with an emulator

To test it using an emulator, you need to create an emulator with android play services and API version 24 or higher. See [my stackoverflow answer](https://stackoverflow.com/questions/71325279/missing-featurename-auth-api-credentials-begin-sign-in-version-6/75285717#75285717). For older API levels like 24, you may need to update Chrome after creating the emulator because the plugin targets JavaScript es2017.

# Supported platforms
Android, iOS, Web.

# Demos
See the `demo` folder.

# Detailed description of different use cases

See https://developers.google.com/identity/gsi/web/guides/features

# Exposed api
See `src/definitions.ts` for a complete definition.

```TypeScript
/**
 * For the web platform, starts pre-loading the google one tap JavaScript library.
 * @param options 
 */
initialize(options: InitializeOptions): Promise<void>;
/**
 * Tries to either auto-sign-in the user or sign-in the user with just one tap/click.
 * If there is a single google account and that account has previously signed into the app, 
 * then that user is auto signed in. A short popover is displayed during sign-in.
 * If there are multiple google accounts and more than one have previously signed into the 
 * app then a user selection screen is shown.
 * If there is no active google session or if no user session has logged in previously in 
 * the app or if the user has opt out of One Tap, then the response will indicate that 
 * the auto sign-in did not succeed.
 * See https://developers.google.com/identity/gsi/web/guides/features
 * @returns A Promise object that contains 3 properties with promises. One resolves only 
 * when authentication succeeds, the second on error and the third on success or error.
 */
tryAutoOrOneTapSignIn()
: Promise<{
  successPromise: Promise<SuccessSignInResult>;
  noSuccess: Promise<NoSuccessSignInResult>;
  signInResultOptionPromise: Promise<SignInResultOption>;
}>;
/**
 * Renders the sign-in button.
 * The returned promise will only resolve if successful.
 * @param parentElementId 
 * @param options 
 * @param gsiButtonConfiguration Not all button configuration options are supported on android.
 */
renderSignInButton(
  parentElementId: string,
  options: RenderSignInButtonOptions,
  gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SuccessSignInResult>;
/**
 * Ends the session.
 */
signOut(): Promise<SignOutResult>;
/**
 * Gets the last user defined or auto-created nonce.
 * Unfortunately not all google libraries support setting a nonce, so this is currently 
 * not universally useful.
 */
getNonce(): string;

```

# Design decisions
Promises will not be rejected for anticipated unsuccessful control flow. For example, if the one tap auto-login does not succeed with the reason `opt_out_or_no_session` then this is not exceptional but expected in many cases. Rejecting the promise would mean the caller would have to catch an exception when calling `await xy` and then run follow-up code in the catch block. However when creating the demo app it was also evident that it is useful to have a promise that only resolves when authentication succeeds. Therefore the `tryAutoOrOneTapSignIn` method returns a Promise object that contains 3 properties with promises. One resolves only when authentication succeeds, the second on error and the third on success or error.

Instead of creating one signIn method with many parameters that are only used in some cases (=unclear dependencies), there are two methods with different parameters and different return types.

Parameters that are independent of a sign-in method as the clientId must be passed to `initialize`.

## Contributions
Welcome

## License

[MIT](./LICENSE)
