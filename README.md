# Capacitor Native Google One Tap Signin plugin

Wraps the native android One Tap api for ionic capacitor apps. One Tap Sign In is part of Sign in with Google and offers features as automatic sign-in on return visits.

This library intends to provide the best google authentication experience for each platform.

<img src="screenshots/one-tap-sign-in-demo-initial-sign-in.jpg" alt="One tap signin screenshot initial sign-in" width=250/>
<img src="screenshots/one-tap-sign-in-demo-sign-back-in.jpg" alt="One tap signin screenshot sign back in" width=250/>
<img src="screenshots/one-tap-sign-in-demo-without-filter-by-authorized-acounts.jpg" alt="One tap signin screenshot without filter by authorized accounts" width=250/>


Currently the idToken, id (e-mail), displayName, givenName, familyName, profilePictureUri are returned. You may check the idToken contents on https://jwt.io/.

The user is automatically signed-in, without a prompt after the first sign-in.

The andorid minSdkVersion is 24, however the one-tap library seems to require API version 29. For lower API versions GoogleSignIn is used.

# Supported platforms
Android, iOS, Web.

# Demos
See the `demo` folder.

# Setup
You need to provide the plug-in a client ID of type "Web application". However you will also need to create a client ID of type "Android" as stated in the [One Tap Get started docu](https://developers.google.cn/identity/one-tap/android/get-started) in the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).

To test it using an emulator, you need to create an emulator with android play services and API version 24 or higher. See [my stackoverflow answer](https://stackoverflow.com/questions/71325279/missing-featurename-auth-api-credentials-begin-sign-in-version-6/75285717#75285717). For older API levels like 24, you may need to update Chrome after creating the emulator because the plugin targets JavaScript es2017.

# Usage recommendation


# Exposed api
See `src/definitions.ts` for a complete definition.

```JavaScript
/**
 * For the web platform, starts pre-loading the google one tap JavaScript library. Calling initialize is optional.
 */
initialize(): Promise<void>;
/**
 * Tries to auto-sign in the user.
 * If there is no single user session that logged in previously in the app, the sign-in will fail.
 * @param options 
 */
tryAutoSignIn(options: SignInOptions): Promise<SignInResult>;
/**
 * Tries to shows the one-tab user selection popup.
 * If there is no authorized session in the browser it will fail and the login button must be shown.
 * @param options 
 */
trySignInWithPrompt(options: SignInOptions): Promise<SignInResult>;
/**
 * Tries to auto-sign in the user and if not possible tries to shows the one-tab user selection.
 * If there is no authorized session in the browser it will use Google Sign in.
 * @param options 
 */
tryAutoSignInThenTrySignInWithPrompt(options: SignInOptions): Promise<SignInResult>;
signOut(): Promise<SignOutResult>;
renderButton(parentElementId: string, options: SignInOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult>;
```

# Design decisions
Promises will not be rejected for anticipated unsuccessful control flow. For example, if the one tap auto-login does not succeed with the reason `opt_out_or_no_session` then this is not exceptional but expected in many cases. Rejecting the promise would mean the caller would have to catch an exception when calling `await xy` and then run follow-up code in the catch block. Instead of rejecting promises the resolved promise contains a `isSuccess` property.

## Contributions
Welcome

## Install

#### 1. Install package

```sh
npm i --save capacitor-native-google-one-tap-signin
```

#### 2. Update capacitor deps

```sh
npx cap update
```

## Usage

### Android

todo

## License

[MIT](./LICENSE)
