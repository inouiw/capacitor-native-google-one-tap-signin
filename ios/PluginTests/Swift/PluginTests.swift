import XCTest
import Capacitor
@testable import Plugin

class PluginTests: XCTestCase {
    
    var plugin: GoogleOneTapAuth!
    var mockBridge: MockBridge!
    
    override func setUp() {
        super.setUp()
        plugin = GoogleOneTapAuth()
        plugin.load()
        
        mockBridge = MockBridge()
        mockBridge.viewController = MockViewController()
        plugin.bridge = mockBridge
    }
    
    override func tearDown() {
        plugin = nil
        mockBridge = nil
        super.tearDown()
    }
    
    private func createPluginCall(options: [AnyHashable: Any] = [:], success: @escaping CAPPluginCallSuccessHandler, error: @escaping CAPPluginCallErrorHandler) -> CAPPluginCall {
        return CAPPluginCall(callbackId: "test", options: options, success: success, error: error)
    }

    private func initializePlugin(nonce: String, isNonceFromApp: Bool) {
        let resolveCalledExpectation = self.expectation(description: "initialize resolved")
        let call = createPluginCall(options: ["clientId": "web-client-id", "nonce": nonce, "isNonceFromApp": isNonceFromApp], success: { (_, _) in
            resolveCalledExpectation.fulfill()
        }, error: { (error) in
            XCTFail("initialize failed with error: \(String(describing: error))")
        })
        plugin.initialize(call)
        waitForExpectations(timeout: 5)
    }
    
    private func createPluginCallAssertNoError() -> CAPPluginCall {
        let resolveOrRejectCalledExpectation = self.expectation(description: "Callback called")
        return createPluginCall(success: { (result, _) in
            // do nothing
            resolveOrRejectCalledExpectation.fulfill()
        }, error: { (error) in
            XCTFail("Call failed with error: \(String(describing: error))")
        })
    }
    
    private func createPluginCallAssertSuccessIdToken(_ expectedIdToken: String = MockGIDSignIn.tokenString) -> CAPPluginCall {
        let resolveOrRejectCalledExpectation = self.expectation(description: "Callback called")
        return createPluginCall(success: { (result, _) in
            guard let data = result?.data,
                  let isSuccess = data["isSuccess"] as? Bool,
                  let success = data["success"] as? [String: Any],
                  let idToken = success["idToken"] as? String else {
                XCTFail("Invalid result structure")
                return
            }
            XCTAssertTrue(isSuccess)
            XCTAssertEqual(idToken, expectedIdToken)
            resolveOrRejectCalledExpectation.fulfill()
        }, error: { (error) in
            XCTFail("Call failed with error: \(String(describing: error))")
        })
    }
    
    private func createPluginCallAssertIsSuccessFalse() -> CAPPluginCall {
        let resolveOrRejectCalledExpectation = self.expectation(description: "Callback called")
        return createPluginCall(success: { (result, _) in
            guard let data = result?.data,
                  let isSuccess = data["isSuccess"] as? Bool else {
                XCTFail("Invalid result structure")
                return
            }
            XCTAssertFalse(isSuccess)
            resolveOrRejectCalledExpectation.fulfill()
        }, error: { (error) in
            XCTFail("Call failed with error: \(String(describing: error))")
        })
    }
    
    func testInitialize() {
        let call = createPluginCallAssertNoError()
        plugin.initialize(call)
        waitForExpectations(timeout: 5)
    }
    
    func testTryAutoOrOneTapSignInWithToken() {
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: false)
        let call = createPluginCallAssertSuccessIdToken()
        plugin.tryAutoOrOneTapSignIn(call)
        waitForExpectations(timeout: 5)
    }
    
    func testTryAutoSignIn_hasPreviousSignIn() {
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: true)
        let call = createPluginCallAssertSuccessIdToken()
        plugin.tryAutoSignIn(call)
        waitForExpectations(timeout: 5)
    }
    
    func testTryAutoSignIn_hasNotPreviousSignIn() {
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: false)
        let call = createPluginCallAssertIsSuccessFalse()
        plugin.tryAutoSignIn(call)
        waitForExpectations(timeout: 5)
    }
    
    func testTryOneTapSignIn() {
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: true)
        let call = createPluginCallAssertSuccessIdToken()
        plugin.tryOneTapSignIn(call)
        waitForExpectations(timeout: 5)
    }
    
    func testSignInWithGoogleButtonFlowForNativePlatform() {
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: true)
        let call = createPluginCallAssertSuccessIdToken()
        plugin.signInWithGoogleButtonFlowForNativePlatform(call)
        waitForExpectations(timeout: 5)
    }

    func testInteractiveSignInPassesNonce() {
        let mock = MockGIDSignIn(hasPreviousSignIn: false)
        plugin.googleSignIn = mock
        initializePlugin(nonce: "server-nonce", isNonceFromApp: true)
        let call = createPluginCallAssertSuccessIdToken()
        plugin.tryOneTapSignIn(call)
        waitForExpectations(timeout: 5)
        XCTAssertEqual(mock.lastSignInNonce, "server-nonce")
    }

    func testTryAutoSignIn_restoredNonceDiffersFromAppNonce_returnsNoSuccess() {
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: true, previousIdToken: MockGIDSignIn.idToken(nonce: "old-nonce"))
        initializePlugin(nonce: "server-nonce", isNonceFromApp: true)
        let call = createPluginCallAssertIsSuccessFalse()
        plugin.tryAutoSignIn(call)
        waitForExpectations(timeout: 5)
    }

    func testTryAutoSignIn_restoredNonceEqualsAppNonce_returnsRestoredToken() {
        let restoredIdToken = MockGIDSignIn.idToken(nonce: "server-nonce")
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: true, previousIdToken: restoredIdToken)
        initializePlugin(nonce: "server-nonce", isNonceFromApp: true)
        let call = createPluginCallAssertSuccessIdToken(restoredIdToken)
        plugin.tryAutoSignIn(call)
        waitForExpectations(timeout: 5)
    }

    func testTryAutoSignIn_restoredNonceDiffersFromGeneratedNonce_returnsRestoredToken() {
        let restoredIdToken = MockGIDSignIn.idToken(nonce: "old-nonce")
        plugin.googleSignIn = MockGIDSignIn(hasPreviousSignIn: true, previousIdToken: restoredIdToken)
        initializePlugin(nonce: "generated-nonce", isNonceFromApp: false)
        let call = createPluginCallAssertSuccessIdToken(restoredIdToken)
        plugin.tryAutoSignIn(call)
        waitForExpectations(timeout: 5)
    }

    func testTryAutoOrOneTapSignIn_restoredNonceDiffersFromAppNonce_signsInInteractively() {
        let mock = MockGIDSignIn(hasPreviousSignIn: true, previousIdToken: MockGIDSignIn.idToken(nonce: "old-nonce"))
        plugin.googleSignIn = mock
        initializePlugin(nonce: "server-nonce", isNonceFromApp: true)
        let call = createPluginCallAssertSuccessIdToken()
        plugin.tryAutoOrOneTapSignIn(call)
        waitForExpectations(timeout: 5)
        XCTAssertEqual(mock.lastSignInNonce, "server-nonce")
    }

    func testNonceClaim() {
        XCTAssertEqual(GoogleOneTapAuth.nonceClaim(ofIdToken: MockGIDSignIn.idToken(nonce: "abc-_123")), "abc-_123")
        XCTAssertNil(GoogleOneTapAuth.nonceClaim(ofIdToken: "not-a-jwt"))
    }
}
