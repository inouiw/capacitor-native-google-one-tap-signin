#ifndef GIDToken_Testing_h
#define GIDToken_Testing_h

#import <GoogleSignIn/GoogleSignIn.h>

@interface GIDToken (Testing)

- (instancetype)initWithTokenString:(NSString *)tokenString;

@end

#endif /* GIDToken_Testing_h */
