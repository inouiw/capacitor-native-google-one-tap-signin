# Capacitor Native Google One Tap Signin plugin

Wraps the native android One Tap api for ionic capacitor apps. One Tap Sign In is part of Sign in with Google and offers features as automatic sign-in on return visits.

This library intends to provide the best google authentication experience for each platform.

<img src="screenshots/one-tap-sign-in-demo-initial-sign-in.jpg" alt="One tap signin screenshot initial sign-in" width=250/>
<img src="screenshots/one-tap-sign-in-demo-sign-back-in.jpg" alt="One tap signin screenshot sign back in" width=250/>
<img src="screenshots/one-tap-sign-in-demo-without-filter-by-authorized-acounts.jpg" alt="One tap signin screenshot without filter by authorized accounts" width=250/>


After a successful authentication, the idToken is returned as base64 and as object.

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

For web, it will auto-sign in even if the user signs out.
For android, after sign-out sill be able to add another google account.

# Detailed description of different use cases

See https://developers.google.com/identity/gsi/web/guides/features

# Exposed api
See `src/definitions.ts` for a complete definition.

```JavaScript
/**
 * For the web platform, starts pre-loading the google one tap JavaScript library.
 * @param options 
 */
initialize(options: InitializeOptions): Promise<void>;
/**
 * Tries to auto-sign in the user.
 * If there is a single google account and that account has previously signed into the app, then that user is auto signed in. A short popover is displayed during sign-in.
 * If there are multiple google accounts and more than one have previously signed into the app then a user selection screen is shown.
 * If there is no active google session or if no user session has logged in previously in the app or if the user has opt out of One Tap, the auto sign-in will fail.
 * See https://developers.google.com/identity/gsi/web/guides/features
 */
tryAutoSignIn(): Promise<SignInResult>;
/**
 * 
 * @param parentElementId 
 * @param options 
 * @param gsiButtonConfiguration Not all button configuration options are supported on android.
 */
renderSignInButton(parentElementId: string, options: RenderSignInButtonOptions, gsiButtonConfiguration?: google.GsiButtonConfiguration): Promise<SignInResult>;
/**
 * Ends the session.
 */
signOut(): Promise<SignOutResult>;
/**
 * Gets the last user defined or auto-created nonce.
 */
getNonce(): string;
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
