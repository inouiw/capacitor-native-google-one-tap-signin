package com.proventask.capacitor.GoogleOneTapAuth;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.credentials.Credentials;
import com.google.android.gms.auth.api.credentials.CredentialsClient;
import com.google.android.gms.auth.api.identity.BeginSignInRequest;
import com.google.android.gms.auth.api.identity.BeginSignInResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.identity.SignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin()
public class GoogleOneTapAuth extends Plugin {
    private static final String TAG = "GoogleOneTapAuth Plugin";

    private String androidClientId;
    private SignInClient oneTapClient;
    private CredentialsClient mCredentialsClient;
    private GoogleSignInClient mSignInClient;
    private PluginCall currentPluginCall = null;
    private ActivityResultLauncher<IntentSenderRequest> googleOneTapSignInActivityResultHandlerIntentSenderRequest;
    private boolean isSignInInProgress = false;

    @Override
    public void load() {
        androidClientId = getConfig().getString("androidClientId");

        if (androidClientId == null || androidClientId.endsWith("apps.googleusercontent.com") == false) {
            throw new RuntimeException("androidClientId must end with 'apps.googleusercontent.com' but is: " + androidClientId);
        }

        oneTapClient = Identity.getSignInClient(this.getActivity());
        mCredentialsClient = Credentials.getClient(this.getContext());
        // DEFAULT_SIGN_IN scopes are id and profile, see GoogleSignInOptions
        var gsoBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(androidClientId);
        mSignInClient = GoogleSignIn.getClient(this.getContext(), gsoBuilder.build());

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
                    isSignInInProgress = false;
                });
    }

    @PluginMethod()
    public void signIn(PluginCall call) {
        if (!isSignInInProgress) {
            isSignInInProgress = true;
            currentPluginCall = call;
            beginSignIn(true);
        }
    }

    private BeginSignInRequest createBeginSignInRequest(boolean tryAutoLogin) {
        return BeginSignInRequest.builder()
                .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                        .setSupported(true)
                        // Your server's client ID, not your Android client ID.
                        .setServerClientId(androidClientId)
                        // If true, only the Google accounts that the user has authorized before will show up in the credential list. This can
                        // help prevent a new account being created when the user has an existing account registered with the application.
                        .setFilterByAuthorizedAccounts(tryAutoLogin)
                        .build())
                // For users who opt-in, Auto Select allows a credential to be selected automatically without waiting for a user action (such as tapping on the "continue" button).
                .setAutoSelectEnabled(tryAutoLogin)
                .build();
    }

    private void beginSignIn(boolean tryAutoLogin) {
        var beginSignInRequest = createBeginSignInRequest(tryAutoLogin);

        oneTapClient.beginSignIn(beginSignInRequest)
                .addOnCompleteListener(new OnCompleteListener<BeginSignInResult>() {
                    @Override
                    public void onComplete(@NonNull Task<BeginSignInResult> task) {
                        if (task.isSuccessful()) {
                            var result = task.getResult();
                            var intentSender = result.getPendingIntent().getIntentSender();
                            var intentSenderRequest = new IntentSenderRequest.Builder(intentSender).build();
                            googleOneTapSignInActivityResultHandlerIntentSenderRequest.launch(intentSenderRequest);
                        } else {
                            if (tryAutoLogin) {
                                beginSignIn(false);
                            }
                            else {
                                Log.e(TAG, "beginSignIn failed", task.getException());
                                var errorMessage = task.getException().toString();
                                if (errorMessage.contains("ApiException: 8")) {
                                    errorMessage += "\nOne reason for the exception is when the device has no internet.";
                                }
                                currentPluginCall.reject(errorMessage);
                                isSignInInProgress = false;
                            }
                        }
                    }
                });
    }

    @PluginMethod()
    public void signOut(final PluginCall call) {
        oneTapClient.signOut()
                .addOnCompleteListener(new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        if (task.isSuccessful()) {
                            call.resolve(null);
                        } else {
                            Log.e(TAG, "signOut failed", task.getException());
                            call.reject(task.getException().toString());
                        }
                    }
                });
    }
}
