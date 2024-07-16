#ifndef GIDSignInResult_Testing_h
#define GIDSignInResult_Testing_h

#import <GoogleSignIn/GIDSignIn.h>
#import <GoogleSignIn/GIDSignInResult.h>

@interface GIDSignInResult (Testing)

- (instancetype)initWithUser:(GIDGoogleUser *)user serverAuthCode:(NSString *)serverAuthCode;

@end

#endif /* GIDSignInResult_Testing_h */
