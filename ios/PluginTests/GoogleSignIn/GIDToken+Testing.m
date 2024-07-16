#import "GIDToken+Testing.h"
#import <objc/runtime.h>

@implementation GIDToken (Testing)

static char kTokenStringKey;

- (instancetype)initWithTokenString:(NSString *)tokenString {
    self = [super init];
    if (self) {
        // Use associated objects because the variables as _tokenString are not accessible.
        objc_setAssociatedObject(self, &kTokenStringKey, [tokenString copy], OBJC_ASSOCIATION_COPY_NONATOMIC);
    }
    return self;
}

- (NSString *)tokenString {
    return objc_getAssociatedObject(self, &kTokenStringKey);
}

@end
