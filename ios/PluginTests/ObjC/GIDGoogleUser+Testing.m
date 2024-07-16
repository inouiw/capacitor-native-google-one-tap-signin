#import "GIDGoogleUser+Testing.h"
#import <objc/runtime.h>

@implementation GIDGoogleUser (Testing)

static char kIDTokenKey;

- (instancetype)initWithIDToken:(GIDToken *)idToken {
    self = [super init];
    if (self) {
        // Use associated objects because the variables as _idToken are not accessible.
        objc_setAssociatedObject(self, &kIDTokenKey, idToken, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    return self;
}

- (GIDToken *)idToken {
    return objc_getAssociatedObject(self, &kIDTokenKey);
}

@end
