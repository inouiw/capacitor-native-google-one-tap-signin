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
    
    private func createPluginCall(success: @escaping CAPPluginCallSuccessHandler, error: @escaping CAPPluginCallErrorHandler) -> CAPPluginCall {
        return CAPPluginCall(callbackId: "test", options: [:], success: success, error: error)
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
    
    private func createPluginCallAssertSuccessIdToken() -> CAPPluginCall {
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
            XCTAssertEqual(idToken, MockGIDSignIn.tokenString)
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
}
