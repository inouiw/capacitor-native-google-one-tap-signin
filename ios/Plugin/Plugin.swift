import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleOneTapAuth)
public class GoogleOneTapAuth: CAPPlugin {
    var googleSignIn: GIDSignIn!;
    let gIDSignInErrorCodeCanceled = -5
    
    public override func load() {
        googleSignIn = GIDSignIn.sharedInstance;
    }
    
    @objc
    func initialize(_ call: CAPPluginCall) {
        call.resolve()
    }
    
    @objc
    func tryAutoOrOneTapSignIn(_ call: CAPPluginCall) {
        nonInteractiveSignIn(call) { signInResult in
            if signInResult.idToken != nil {
                call.resolve(self.toJsonResult(SignInResult(idToken: signInResult.idToken!)))
                return
            }
            self.interactiveSignIn(call)
        }
    }
    
    @objc
    func tryAutoSignIn(_ call: CAPPluginCall) {
        nonInteractiveSignIn(call) { isSuccess in
        }
    }
    
    @objc
    func tryOneTapSignIn(_ call: CAPPluginCall) {
        interactiveSignIn(call)
    }
    
    // This method is not part of the api but only called from GoogleOneTapAuth.ts in method renderSignInButton.
    @objc
    func triggerGoogleSignIn(_ call: CAPPluginCall) {
        interactiveSignIn(call)
    }
    
    func nonInteractiveSignIn(_ call: CAPPluginCall, completion: @escaping (SignInResult) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if googleSignIn.hasPreviousSignIn() {
                googleSignIn.restorePreviousSignIn() { user, error in
                    if let error = error {
                        completion(SignInResult(noSuccessReasonCode: error.localizedDescription, noSuccessAdditionalInfo: "api method: restorePreviousSignIn, error code: \(error._code)"))
                        return
                    }
                    let idToken = user?.idToken?.tokenString
                    
                    if (idToken != nil) {
                        completion(SignInResult(idToken: idToken!))
                    } else {
                        completion(SignInResult(noSuccessReasonCode: "NO_CREDENTIAL", noSuccessAdditionalInfo: nil))
                    }
                }
            } else {
               completion(SignInResult(noSuccessReasonCode: "NO_CREDENTIAL", noSuccessAdditionalInfo: nil))
            }
        }
    }
    
    func interactiveSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let presentingVc = self.bridge!.viewController!
            self.googleSignIn.signIn(withPresenting: presentingVc) { signInResult, error in
                if let error = error {
                    if (error._code == self.gIDSignInErrorCodeCanceled) {
                        call.resolve(self.toJsonResult(SignInResult(noSuccessReasonCode: "SIGN_IN_CANCELLED", noSuccessAdditionalInfo: nil)))
                        return;
                    }
                    call.resolve(self.toJsonResult(SignInResult(noSuccessReasonCode: error.localizedDescription, noSuccessAdditionalInfo: "api method: signIn, error code: \(error._code)")))
                    return;
                }
                let idToken = signInResult?.user.idToken?.tokenString
                
                if (idToken != nil) {
                    call.resolve(self.toJsonResult(SignInResult(idToken: idToken!)))
                } else {
                    call.resolve(self.toJsonResult(SignInResult(noSuccessReasonCode: "NO_CREDENTIAL", noSuccessAdditionalInfo: nil)))
                }
            };
        }
    }
    
    @objc
    func renderSignInButton(_ call: CAPPluginCall) {
        call.resolve()
    }
    
    @objc
    func cancelOneTapDialog(_ call: CAPPluginCall) {
        call.resolve()
    }
    
    @objc
    func signOut(_ call: CAPPluginCall) {
        googleSignIn.signOut();
        call.resolve(createSuccessSignOutResult());
    }
    
    private func toJsonResult(_ signInResult: SignInResult) -> [String: Any] {
        var result: [String: Any] = [:]
        let isSuccess = signInResult.idToken != nil
        result["isSuccess"] = isSuccess
        
        if isSuccess {
            var successObj: [String: Any] = [:]
            successObj["idToken"] = signInResult.idToken
            result["success"] = successObj
        } else {
            var errorObj: [String: Any] = [:]
            errorObj["noSuccessReasonCode"] = signInResult.noSuccessReasonCode
            errorObj["noSuccessAdditionalInfo"] = signInResult.noSuccessAdditionalInfo
            result["noSuccess"] = errorObj
        }
        
        return result
    }
    
    private func createSuccessSignOutResult() -> [String: Any] {
        let successResultJson: [String: Any] = [
            "isSuccess": true,
        ];
        return successResultJson;
    }
}

class SignInResult {
    var idToken: String?
    var noSuccessReasonCode: String?
    var noSuccessAdditionalInfo: String?

    init(idToken: String? = nil, noSuccessReasonCode: String? = nil, noSuccessAdditionalInfo: String? = nil) {
        self.idToken = idToken
        self.noSuccessReasonCode = noSuccessReasonCode
        self.noSuccessAdditionalInfo = noSuccessAdditionalInfo
    }

    convenience init(noSuccessReasonCode: String?, noSuccessAdditionalInfo: String?) {
        self.init(idToken: nil, noSuccessReasonCode: noSuccessReasonCode, noSuccessAdditionalInfo: noSuccessAdditionalInfo)
    }

    convenience init(idToken: String?) {
        self.init(idToken: idToken, noSuccessReasonCode: nil, noSuccessAdditionalInfo: nil)
    }
}
