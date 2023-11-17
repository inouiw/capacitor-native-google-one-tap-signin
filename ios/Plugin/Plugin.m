#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(GoogleOneTapAuth, "GoogleOneTapAuth",
           CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(tryAutoOrOneTapSignIn, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(tryOneTapSignIn, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(tryAutoSignIn, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(triggerGoogleSignIn, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(signOut, CAPPluginReturnPromise);
)
