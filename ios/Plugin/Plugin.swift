import Foundation
import Capacitor
import GoogleSignIn

@objc(GoogleOneTapAuth)
public class GoogleOneTapAuth: CAPPlugin {
    var googleSignIn: GIDSignIn!;
    var additionalScopes: [String]!;
    var clientId: String!;
    //var nonce: String!; // Currently the GoogleSignIn library does not support passing a nonce.
    
    public override func load() {
        googleSignIn = GIDSignIn.sharedInstance;
    }
    
    @objc
    func initialize(_ call: CAPPluginCall) {
        
        //        NotificationCenter.default.addObserver(self, selector: #selector(handleOpenUrl(_ :)), name: Notification.Name(Notification.Name.capacitorOpenURL.rawValue), object: nil);
        
        call.resolve();
    }
    
    //    @objc
    //    func handleOpenUrl(_ notification: Notification) {
    //        guard let object = notification.object as? [String: Any] else {
    //            print("There is no object on handleOpenUrl");
    //            return;
    //        }
    //        guard let url = object["url"] as? URL else {
    //            print("There is no url on handleOpenUrl");
    //            return;
    //        }
    //        googleSignIn.handle(url);
    //    }
    
    @objc
    func tryAutoSignIn(_ call: CAPPluginCall) {
        //DispatchQueue.main.async {
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
        //}
    }
    
    @objc
    func renderSignInButton(_ call: CAPPluginCall) {
        call.resolve();
    }
    
    //
    //    @objc
    //    func refresh(_ call: CAPPluginCall) {
    //        DispatchQueue.main.async {
    //            if self.googleSignIn.currentUser == nil {
    //                call.reject("User not logged in.");
    //                return
    //            }
    //            self.googleSignIn.currentUser!.authentication.do { (authentication, error) in
    //                guard let authentication = authentication else {
    //                    call.reject(error?.localizedDescription ?? "Something went wrong.");
    //                    return;
    //                }
    //                let authenticationData: [String: Any] = [
    //                    "accessToken": authentication.accessToken,
    //                    "idToken": authentication.idToken ?? NSNull(),
    //                    "refreshToken": authentication.refreshToken
    //                ]
    //                call.resolve(authenticationData);
    //            }
    //        }
    //    }
    
    @objc
    func signOut(_ call: CAPPluginCall) {
        //DispatchQueue.main.async {
        googleSignIn.signOut();
        //}
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
    
    //    func createErrorResult(error: String?) {
    //        var errorResultJson: [String: Any] = [
    //            "isSuccess": false,
    //            "error": error ?? NSNull(),
    //        ];
    //        return errorResultJson;
    //    }
    
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
