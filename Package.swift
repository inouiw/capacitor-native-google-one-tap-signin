
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorNativeGoogleOneTapSignin",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "CapacitorNativeGoogleOneTapSignin",
            targets: ["Plugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "7.1.0")
    ],
    targets: [
        .target(
            name: "Plugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "ios/Plugin"),
        .testTarget(
            name: "PluginTests",
            dependencies: ["Plugin"],
            path: "ios/PluginTests")
    ]
)
