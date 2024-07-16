#import "GIDSignInResult+Testing.h"
#import "GIDGoogleUser+Testing.h"

#import <objc/runtime.h>

@implementation GIDSignInResult (Testing)

static char kUserKey;
static char kServerAuthCodeKey;

- (instancetype)initWithUser:(GIDGoogleUser *)user serverAuthCode:(NSString *)serverAuthCode {
    self = [super init];
    if (self) {
        // Use associated objects because the variables as _user are not accessible.
        objc_setAssociatedObject(self, &kUserKey, user, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
        objc_setAssociatedObject(self, &kServerAuthCodeKey, [serverAuthCode copy], OBJC_ASSOCIATION_COPY_NONATOMIC);
    }
    return self;
}

- (GIDGoogleUser *)user {
    return objc_getAssociatedObject(self, &kUserKey);
}

- (NSString *)serverAuthCode {
    return objc_getAssociatedObject(self, &kServerAuthCodeKey);
}

@end
