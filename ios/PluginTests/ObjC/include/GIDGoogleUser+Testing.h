#ifndef GIDGoogleUser_Testing_h
#define GIDGoogleUser_Testing_h

#import <GoogleSignIn/GoogleSignIn.h>

@interface GIDGoogleUser (Testing)

- (instancetype)initWithIDToken:(GIDToken *)idToken;

@end

#endif /* GIDGoogleUser_Testing_h */
