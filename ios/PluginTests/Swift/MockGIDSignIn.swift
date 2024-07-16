import UIKit
@testable import Plugin
import GoogleSignIn

class MockGIDSignIn: GIDSignInProtocol {
    static var tokenString: String = "tokenString"
    var signInCompletion: ((GIDSignInResult?, Error?) -> Void)?
    private var previousUser: GIDGoogleUser?
    
    init(hasPreviousSignIn: Bool) {
        if hasPreviousSignIn {
            self.previousUser = createGoogleUser()
        }
    }
    
    func createGoogleUser() -> GIDGoogleUser {
        let idToken = GIDToken(tokenString: MockGIDSignIn.tokenString)
        return GIDGoogleUser(idToken: idToken)
    }
    
    func signIn(withPresenting presentingViewController: UIViewController, completion: ((GIDSignInResult?, Error?) -> Void)?) {
        let googleUser = previousUser ?? createGoogleUser()
        let signInResult = GIDSignInResult(user: googleUser, serverAuthCode: "")
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
