import UIKit
@testable import Plugin
import GoogleSignIn

class MockGIDSignIn: GIDSignInProtocol {
    static var tokenString: String = "tokenString"
    var signInCompletion: ((GIDSignInResult?, Error?) -> Void)?
    // The nonce passed to the last interactive sign-in.
    var lastSignInNonce: String?
    private var previousUser: GIDGoogleUser?

    init(hasPreviousSignIn: Bool, previousIdToken: String = MockGIDSignIn.tokenString) {
        if hasPreviousSignIn {
            self.previousUser = createGoogleUser(idToken: previousIdToken)
        }
    }

    /// Returns an unsigned JWT with the given nonce claim.
    static func idToken(nonce: String) -> String {
        func base64Url(_ json: String) -> String {
            return Data(json.utf8).base64EncodedString()
                .replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_")
                .replacingOccurrences(of: "=", with: "")
        }
        return base64Url("{\"alg\":\"none\"}") + "." + base64Url("{\"nonce\":\"\(nonce)\"}") + ".signature"
    }

    func createGoogleUser(idToken: String = MockGIDSignIn.tokenString) -> GIDGoogleUser {
        let idToken = GIDToken(tokenString: idToken)
        return GIDGoogleUser(idToken: idToken)
    }

    // An interactive sign-in always creates a new user, like GoogleSignIn.
    func signIn(withPresenting presentingViewController: UIViewController, hint: String?, additionalScopes: [String]?, nonce: String?, completion: ((GIDSignInResult?, Error?) -> Void)?) {
        lastSignInNonce = nonce
        let signInResult = GIDSignInResult(user: createGoogleUser(), serverAuthCode: "")
        completion?(signInResult, nil)
    }

    func hasPreviousSignIn() -> Bool {
        return previousUser != nil
    }

    func restorePreviousSignIn(completion: ((GIDGoogleUser?, Error?) -> Void)?) {
        completion?(previousUser, nil)
    }

    func signOut() {
        previousUser = nil
    }

    func disconnect(completion: ((Error?) -> Void)?) {
        previousUser = nil
        completion?(nil)
    }
}
