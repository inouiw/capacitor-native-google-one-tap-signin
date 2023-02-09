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

import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

@CapacitorPlugin()
public class GoogleOneTapAuth extends Plugin {
    private static final String TAG = "GoogleOneTapAuth Plugin";
    private String clientId;
    private SignInClient oneTapClient;
    private ActivityResultLauncher<IntentSenderRequest> googleOneTapSignInActivityResultHandlerIntentSenderRequest;
    private CompletableFuture<JSObject> signInFuture;

    @Override
    public void load() {
        clientId = getConfig().getString("clientId");

        if (clientId == null || clientId.endsWith("apps.googleusercontent.com") == false) {
            throw new RuntimeException("clientId must end with 'apps.googleusercontent.com' but is: " + clientId + ". Check capacitor.config.ts.");
        }
        oneTapClient = Identity.getSignInClient(this.getActivity());
        RegisterSignInResultHandler();
    }

    private void RegisterSignInResultHandler() {
        googleOneTapSignInActivityResultHandlerIntentSenderRequest = bridge.registerForActivityResult(
                new ActivityResultContracts.StartIntentSenderForResult(),
                result -> {
                    var resultCode = result.getResultCode();

                    if (resultCode == Activity.RESULT_OK) {
                        try {
                            Intent data = result.getData();
                            var credential = oneTapClient.getSignInCredentialFromIntent(data);
                            var email = credential.getId();
                            signInFuture.complete(createSuccessResponse(credential.getGoogleIdToken(), email));
                        } catch (ApiException e) {
                            signInFuture.complete(createErrorResponse(e.toString()));
                        }
                    } else {
                        var resultCodeString = ActivityResult.resultCodeToString(resultCode);
                        signInFuture.complete(createErrorResponse(resultCodeString));
                    }
                });
    }

    @PluginMethod()
    public void initialize(PluginCall call) {
        // Currently no code to run here.
        call.resolve();
    }

    @PluginMethod()
    public void tryAutoSignIn(PluginCall call) {
        try {
            var signInResult = beginSignIn(true).get();
            call.resolve(signInResult);
        } catch (ExecutionException e) {
            call.reject(e.toString());
        } catch (InterruptedException e) {
            call.reject(e.toString());
        }
    }

    @PluginMethod()
    public void trySignInWithPrompt(PluginCall call) {
        try {
            var signInResult = beginSignIn(false).get();
            call.resolve(signInResult);
        } catch (ExecutionException e) {
            call.reject(e.toString());
        } catch (InterruptedException e) {
            call.reject(e.toString());
        }
    }

    @PluginMethod()
    public void tryAutoSignInThenTrySignInWithPrompt(PluginCall call) {
        try {
            var signInResult = beginSignIn(true).get();
            if (!signInResult.getBool("isSuccess")) {
                signInResult = beginSignIn(false).get();
            }
            call.resolve(signInResult);
        } catch (ExecutionException e) {
            call.reject(e.toString());
        } catch (InterruptedException e) {
            call.reject(e.toString());
        }
    }

    private Future<JSObject> beginSignIn(boolean filterByAuthorizedAccounts) {
        var context = this.getContext();
        var beginSignInRequest = createBeginSignInRequest(filterByAuthorizedAccounts);
        signInFuture = new CompletableFuture<>();

        oneTapClient.beginSignIn(beginSignInRequest)
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        var result = task.getResult();
                        var intentSender = result.getPendingIntent().getIntentSender();
                        var intentSenderRequest = new IntentSenderRequest.Builder(intentSender).build();
                        googleOneTapSignInActivityResultHandlerIntentSenderRequest.launch(intentSenderRequest);
                    } else {
                        if (filterByAuthorizedAccounts) {
                            Log.i(TAG, "beginSignIn with FilterByAuthorizedAccounts=true failed", task.getException());
                        } else {
                            Log.e(TAG, "beginSignIn with FilterByAuthorizedAccounts=false failed", task.getException());
                        }
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
                        // Other errors:
                        // com.google.android.gms.common.api.ApiException: 10: Caller not whitelisted to call this API.
                        // --> Try if restarting the phone fixes the problem.
                        // --> Test to sign in several times to ensure it works repeatedly.
                        signInFuture.complete(createErrorResponse(errorMessage));
                    }
                });
        return signInFuture;
    }

    private BeginSignInRequest createBeginSignInRequest(boolean filterByAuthorizedAccounts) {
        return BeginSignInRequest.builder()
                .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                        .setSupported(true)
                        // A OAuth client ID with application type "Web application".
                        .setServerClientId(clientId)
                        // If true, only the Google accounts that the user has authorized before will show up in the credential list. This can
                        // help prevent a new account being created when the user has an existing account registered with the application.
                        .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
                        .build())
                // For users who opt-in, Auto Select allows a credential to be selected automatically without waiting for a user action (such as tapping on the "continue" button).
                .setAutoSelectEnabled(true)
                .build();
    }

    private JSObject createErrorResponse(String noSuccessAdditionalInfo) {
        var result = new JSObject();
        result.put("isSuccess", false);
        result.put("noSuccessAdditionalInfo", noSuccessAdditionalInfo);
        return result;
    }

    private JSObject createSuccessResponse(String idToken, String email) {
        var result = new JSObject();
        result.put("isSuccess", true);
        result.put("idToken", idToken);
        result.put("email", email);
        result.put("decodedIdToken", decodeJwtBody(idToken));
        return result;
    }

    private String decodeJwtBody(String jwtToken) {
        var decoder = Base64.getUrlDecoder();
        var parts = jwtToken.split("\\.");
        var payloadJson = new String(decoder.decode(parts[1]));
        return payloadJson;
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
                    var signOutResult = new JSObject();
                    if (task.isSuccessful()) {
                        signOutResult.put("isSuccess", true);
                    } else {
                        Log.e(TAG, "signOut failed", task.getException());
                        signOutResult.put("isSuccess", false);
                        signOutResult.put("error", task.getException().toString());
                    }
                    call.resolve(signOutResult);
                });
    }
}
