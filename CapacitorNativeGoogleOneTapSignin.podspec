
  Pod::Spec.new do |s|
    s.name = 'CapacitorNativeGoogleOneTapSignin'
    s.version = '0.0.1'
    s.summary = 'Google One Tap sign-in plugin for capacitor.'
    s.license = 'MIT'
    s.homepage = 'https://github.com/inouiw/capacitor-native-google-one-tap-signin'
    s.author = 'David Neuy'
    s.source = { :git => 'https://github.com/inouiw/capacitor-native-google-one-tap-signin.git', :tag => s.version.to_s }
    s.source_files = 'ios/Plugin/**/*.{swift,h,m,c,cc,mm,cpp}'
    s.ios.deployment_target  = '12.0'
    s.dependency 'Capacitor'
    s.dependency 'GoogleSignIn', '~> 6.2.4'
    s.static_framework = true,
    s.swift_version = '5.1'
  end
