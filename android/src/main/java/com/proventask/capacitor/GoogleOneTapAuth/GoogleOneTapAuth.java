package com.proventask.capacitor.GoogleOneTapAuth;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.auth.api.identity.BeginSignInRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.identity.SignInClient;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;

@CapacitorPlugin()
public class GoogleOneTapAuth extends Plugin {
    private static final String TAG = "GoogleOneTapAuth Plugin";
    private String androidClientId;
    private SignInClient oneTapClient;
    private PluginCall currentPluginCall = null;
    private ActivityResultLauncher<IntentSenderRequest> googleOneTapSignInActivityResultHandlerIntentSenderRequest;


    @Override
    public void load() {
        androidClientId = getConfig().getString("androidClientId");

        if (androidClientId == null || androidClientId.endsWith("apps.googleusercontent.com") == false) {
            throw new RuntimeException("androidClientId must end with 'apps.googleusercontent.com' but is: " + androidClientId + ". Check capacitor.config.ts.");
        }

        oneTapClient = Identity.getSignInClient(this.getActivity());
        RegisterSignInResultHandler();
    }

    private void RegisterSignInResultHandler() {
        googleOneTapSignInActivityResultHandlerIntentSenderRequest = bridge.registerForActivityResult(
                new ActivityResultContracts.StartIntentSenderForResult(),
                result -> {
                    var resultCode = result.getResultCode();
                    var resultCodeString = ActivityResult.resultCodeToString(resultCode);
                    Intent data = result.getData();

                    var pluginResult = new JSObject();
                    pluginResult.put("resultCodeString", resultCodeString);

                    if (resultCode == Activity.RESULT_OK) {
                        try {
                            var credential = oneTapClient.getSignInCredentialFromIntent(data);
                            pluginResult.put("id", credential.getId());
                            pluginResult.put("idToken", credential.getGoogleIdToken());
                            pluginResult.put("displayName", credential.getDisplayName());
                            pluginResult.put("givenName", credential.getGivenName());
                            pluginResult.put("familyName", credential.getFamilyName());
                            pluginResult.put("profilePictureUri", credential.getProfilePictureUri() == null ? null : credential.getProfilePictureUri().toString());
                            currentPluginCall.resolve(pluginResult);
                        } catch (ApiException e) {
                            currentPluginCall.reject(e.toString(), pluginResult);
                        }
                    } else {
                        currentPluginCall.reject(resultCodeString, pluginResult);
                    }
                });
    }

    @PluginMethod()
    public void signIn(PluginCall call) {
        currentPluginCall = call;
        beginSignIn(true);
    }

    // This method is called first with tryAutoLogin=true and if not successful then with tryAutoLogin=false.
    private void beginSignIn(boolean tryAutoLogin) {
        var context = this.getContext();
        var beginSignInRequest = createBeginSignInRequest(tryAutoLogin);

        oneTapClient.beginSignIn(beginSignInRequest)
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        var result = task.getResult();
                        var intentSender = result.getPendingIntent().getIntentSender();
                        var intentSenderRequest = new IntentSenderRequest.Builder(intentSender).build();
                        googleOneTapSignInActivityResultHandlerIntentSenderRequest.launch(intentSenderRequest);
                    } else {
                        if (tryAutoLogin) {
                            beginSignIn(false);
                        } else {
                            Log.e(TAG, "beginSignIn failed", task.getException());
                            var errorMessage = task.getException().toString();

                            if (!isGooglePlayServicesAvailable(context)) {
                                errorMessage += "\nGooglePlayService is not installed or must be updated.";
                            }
                            if (errorMessage.contains("Missing Feature{name=auth_api_credentials_begin_sign_in")) {
                                errorMessage += "\nGooglePlay is not installed or must be logged in to setup.";
                            }
                            if (errorMessage.contains("ApiException: 8")) {
                                errorMessage += "\nOne reason for the exception is when the device has no internet.";
                            }
                            currentPluginCall.reject(errorMessage);
                        }
                    }
                });
    }

    private BeginSignInRequest createBeginSignInRequest(boolean tryAutoLogin) {
        return BeginSignInRequest.builder()
                .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                        .setSupported(true)
                        // A OAuth client ID with application type "Web application".
                        .setServerClientId(androidClientId)
                        // If true, only the Google accounts that the user has authorized before will show up in the credential list. This can
                        // help prevent a new account being created when the user has an existing account registered with the application.
                        .setFilterByAuthorizedAccounts(tryAutoLogin)
                        .build())
                // For users who opt-in, Auto Select allows a credential to be selected automatically without waiting for a user action (such as tapping on the "continue" button).
                .setAutoSelectEnabled(tryAutoLogin)
                .build();
    }

    private boolean isGooglePlayServicesAvailable(Context context) {
        var googleApiAvailability = GoogleApiAvailability.getInstance();
        int resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context);
        return resultCode == ConnectionResult.SUCCESS;
    }

    @PluginMethod()
    public void signOut(final PluginCall call) {
        oneTapClient.signOut()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        call.resolve(null);
                    } else {
                        Log.e(TAG, "signOut failed", task.getException());
                        call.reject(task.getException().toString());
                    }
                });
    }
}
