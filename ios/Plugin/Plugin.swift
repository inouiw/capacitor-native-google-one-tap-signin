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
        call.resolve();
    }

    @objc
    func tryAutoOrOneTapSignIn(_ call: CAPPluginCall) {
        if googleSignIn.hasPreviousSignIn() {
            googleSignIn.restorePreviousSignIn() { user, error in
                if let error = error {
                    call.reject(error.localizedDescription, "\(error._code)");
                    return;
                }
                call.resolve(self.wrapInSignInResultInOption(self.createSuccessSignInResult(user: user!)))
            }
        } else {
            call.resolve(createNoSuccessSignInResultOption())
        }
    }
    
    @objc
    func tryOneTapSignIn(_ call: CAPPluginCall) {
        // Todo: Should use interactive login.
        tryAutoOrOneTapSignIn(call);
    }
    
    @objc
    func tryAutoSignIn(_ call: CAPPluginCall) {
        // Todo: Should use non-interactive login.
        tryAutoOrOneTapSignIn(call);
    }
    
    // This method is not part of the api but only called from GoogleOneTapAuth.ts in method renderSignInButton.
    @objc
    func triggerGoogleSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let presentingVc = self.bridge!.viewController!
            self.googleSignIn.signIn(withPresenting: presentingVc) { signInResult, error in
                if let error = error {
                    if (error._code == self.gIDSignInErrorCodeCanceled) {
                        call.resolve(self.wrapInSignInResultInOption(self.createErrorResponse(reasonCode: "SIGN_IN_CANCELLED")))
                        return;
                    }
                    call.reject(error.localizedDescription, "\(error._code)")
                    return;
                }
                call.resolve(self.wrapInSignInResultInOption(self.createSuccessSignInResult(user: signInResult?.user)))
            };
        }
    }
    
    @objc
    func renderSignInButton(_ call: CAPPluginCall) {
        call.resolve();
    }
    
    @objc
    func cancelOneTapDialog(_ call: CAPPluginCall) {
        call.resolve();
    }
    
    @objc
    func signOut(_ call: CAPPluginCall) {
        googleSignIn.signOut();
        call.resolve(createSuccessSignOutResult());
    }

    func createErrorResponse(reasonCode: String, noSuccessAdditionalInfo: String? = nil) -> [String: Any] {
        let noSuccessSignInResult: [String: Any] = [
            "noSuccessReasonCode": reasonCode,
            "noSuccessAdditionalInfo": noSuccessAdditionalInfo ?? NSNull(),
        ];
        return noSuccessSignInResult;
    }
    
    func createSuccessSignInResult(user: GIDGoogleUser?) -> [String: Any] {
        let successSignInResult: [String: Any] = [
            "idToken": user?.idToken?.tokenString ?? NSNull(),
        ];
        return successSignInResult;
    }
    
    func wrapInSignInResultInOption(_ successSignInResult: [String: Any]) -> [String: Any] {
        let signInResultOption: [String: Any] = [
            "isSuccess": true,
            "success": successSignInResult,
        ];
        return signInResultOption;
    }
    
    func createNoSuccessSignInResultOption() -> [String: Any] {
        let noSuccessResultJson: [String: Any] = [
            "isSuccess": false,
            "noSuccess": [:] as [String: Any],
        ];
        return noSuccessResultJson;
    }
    
    func createSuccessSignOutResult() -> [String: Any] {
        let successResultJson: [String: Any] = [
            "isSuccess": true,
        ];
        return successResultJson;
    }
}
