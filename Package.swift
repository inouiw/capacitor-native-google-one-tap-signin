// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorNativeGoogleOneTapSignin",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "CapacitorNativeGoogleOneTapSignin",
            targets: ["PluginSwift", "PluginObjC"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main"),
        .package(url: "https://github.com/google/GoogleSignIn-iOS.git", from: "7.1.0")
    ],
    targets: [
        .target(
            name: "PluginSwift",
            dependencies: [
                .target(name: "PluginObjC"),
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS")
            ],
            path: "ios/Plugin/Swift",
            sources: ["Plugin.swift", "GIDSignInProtocol.swift"]
        ),
        .target(
            name: "PluginObjC",
            dependencies: [],
            path: "ios/Plugin/ObjC",
            sources: ["Plugin.m"],
            resources: [.copy("../Info.plist")],
            publicHeadersPath: "include"
        ),
        .testTarget(
            name: "PluginTestsSwift",
            dependencies: ["PluginSwift"],
            path: "ios/PluginTests/Swift",
            sources: ["MockBridge.swift", "MockGIDSignIn.swift", "MockViewController.swift", "PluginTests.swift"],
            resources: [.copy("../Info.plist")],
            cSettings: [
                .headerSearchPath("../ObjC/include"),
                .define("SWIFT_PACKAGE")
            ]
        ),
        .testTarget(
            name: "PluginTestsObjC",
            dependencies: [],
            path: "ios/PluginTests/ObjC",
            sources: ["GIDGoogleUser+Testing.m", "GIDSignInResult+Testing.m", "GIDToken+Testing.m"]
        )
    ]
)
