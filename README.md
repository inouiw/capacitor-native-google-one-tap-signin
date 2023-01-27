# Capacitor Native Google One Tap Signin plugin

Wraps the native android One Tap sign-in api for ionic capacitor apps.

<img src="screenshots/one-tap-sign-in-demo.jpg" alt="One tap signin screenshot" style="max-height:16cm"/>

Currently the idToken and the id (e-mail) are returned. You may check the idToken contents on https://jwt.io/

# Demos
See the `demo` folder.

# Setup
You need to provide the plug-in a client ID of type "Web application". However you will also need to create a client ID of type "Android" as stated in the [One Tap Get started docu](https://developers.google.cn/identity/one-tap/android/get-started).

To test it using an emulator, you need to create an emulator with android play services. See [my stackoverflow answer](https://stackoverflow.com/questions/71325279/missing-featurename-auth-api-credentials-begin-sign-in-version-6/75285717#75285717).

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
