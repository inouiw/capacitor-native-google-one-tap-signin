import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleOneTapAuth)
public class GoogleOneTapAuth: CAPPlugin {
    var googleSignIn: GIDSignIn!;
    
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
                self.resolveSignInCallWith(call: call, user: user!)
            }
        } else {
            let presentingVc = bridge!.viewController!;
            
            self.googleSignIn.signIn(withPresenting: presentingVc) { signInResult, error in
                if let error = error {
                    call.reject(error.localizedDescription, "\(error._code)");
                    return;
                }
                self.resolveSignInCallWith(call: call, user: signInResult?.user);
            };
        }
    }
    
    @objc
    func renderSignInButton(_ call: CAPPluginCall) {
        call.resolve();
    }
    
    @objc
    func signOut(_ call: CAPPluginCall) {
        googleSignIn.signOut();
        call.resolve(createSuccessResult());
    }
    
    func resolveSignInCallWith(call: CAPPluginCall, user: GIDGoogleUser?) {
        var userData: [String: Any] = [
            "isSuccess": true,
            "idToken": user?.idToken?.tokenString ?? NSNull(),
            "userId": user?.userID ?? NSNull(),
            "email": user?.profile?.email ?? NSNull(),
            "decodedIdToken": decodeJwtBody(jwtToken: user?.idToken?.tokenString) ?? NSNull(),
        ];
        if let imageUrl = user?.profile?.imageURL(withDimension: 100)?.absoluteString {
            userData["imageUrl"] = imageUrl;
        }
        call.resolve(userData);
    }
    
    func createSuccessResult() -> [String: Any] {
        let successResultJson: [String: Any] = [
            "isSuccess": true,
        ];
        return successResultJson;
    }
    
    func decodeJwtBody(jwtToken: String?) -> Any? {
        if let jwtToken = jwtToken {
            let parts = jwtToken.components(separatedBy: ".")
            guard let data = Data(base64Encoded: parts[1]) else {
                print("Invalid base64 string \(parts[1])")
                return nil
            }
            return toJson(data: data);
        }
        return nil
    }
    
    func toJson(data: Data) -> Any? {
        do {
            return try JSONSerialization.jsonObject(with: data, options: [])
        } catch {
            print("Error parsing JSON: \(error)")
            return nil;
        }
    }
}
