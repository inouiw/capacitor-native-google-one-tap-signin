import GoogleSignIn

// Define a protocol for GIDSignIn for easier mocking.
@objc protocol GIDSignInProtocol {
    // Available since GoogleSignIn 9.0. Without a nonce, GoogleSignIn sets its own.
    @objc(signInWithPresentingViewController:hint:additionalScopes:nonce:completion:)
    func signIn(withPresenting presentingViewController: UIViewController, hint: String?, additionalScopes: [String]?, nonce: String?, completion: ((GIDSignInResult?, Error?) -> Void)?)
    
    func hasPreviousSignIn() -> Bool
    
    @objc(restorePreviousSignInWithCompletion:)
    func restorePreviousSignIn(completion: ((GIDGoogleUser?, Error?) -> Void)?)
    
    func signOut()
    
    func disconnect(completion: ((Error?) -> Void)?)
}

// Extend the Objective-C Class to Conform to the Protocol
extension GIDSignIn: GIDSignInProtocol {
    // The methods are already implemented in the GIDSignIn class.
}

@objc protocol GIDSignInResultProtocol {
    // Define the required methods and properties for the protocol
}

extension GIDSignInResult: GIDSignInResultProtocol {
    // Implement the protocol methods and properties
}
