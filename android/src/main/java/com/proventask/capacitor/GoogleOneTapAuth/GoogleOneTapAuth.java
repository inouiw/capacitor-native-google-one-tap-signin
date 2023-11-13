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
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.BeginSignInRequest;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.identity.SignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

@CapacitorPlugin()
public class GoogleOneTapAuth extends Plugin {
    private static final String TAG = "GoogleOneTapAuth Plugin";
    private static final String ReasonCodeSignInCancelled = "SIGN_IN_CANCELLED";
    private String clientId;
    private String nonce;
    private SignInClient oneTapClient;
    private GoogleSignInClient googleSignInClient;
    private ActivityResultLauncher<IntentSenderRequest> googleOneTapSignInActivityResultHandlerIntentSenderRequest;
    private CompletableFuture<SignInResult> oneTapSignInFuture;
    private CompletableFuture<SignInResult> googleSignInFuture;

    @Override
    public void load() {
        registerSignInResultHandler();
    }

    @PluginMethod()
    public void initialize(PluginCall call) {
        initializeOptionsFromCall(call);
        oneTapClient = Identity.getSignInClient(this.getActivity());

        var gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestIdToken(clientId)
                .build();
        googleSignInClient = GoogleSignIn.getClient(this.getActivity(), gso);
        call.resolve();
    }

    private void initializeOptionsFromCall(PluginCall call) {
        // This must be the Client ID of type Web application NOT the Android Client ID.
        clientId = call.getString("clientId");
        nonce = call.getString("nonce");
    }

    private void registerSignInResultHandler() {
        googleOneTapSignInActivityResultHandlerIntentSenderRequest = bridge.registerForActivityResult(
                new ActivityResultContracts.StartIntentSenderForResult(),
                result -> {
                    var resultCode = result.getResultCode();

                    if (resultCode == Activity.RESULT_OK) {
                        try {
                            Intent data = result.getData();
                            var credential = oneTapClient.getSignInCredentialFromIntent(data);
                            oneTapSignInFuture.complete(createSuccessResponse(credential.getGoogleIdToken()));
                        } catch (ApiException e) {
                            oneTapSignInFuture.complete(createErrorResponse(null, e.toString()));
                        }
                    } else {
                        var reasonCode = resultCode == Activity.RESULT_CANCELED ? ReasonCodeSignInCancelled : null;
                        var resultCodeString = ActivityResult.resultCodeToString(resultCode);
                        oneTapSignInFuture.complete(createErrorResponse(reasonCode, resultCodeString));
                    }
                });
    }

    @PluginMethod()
    public void tryAutoOrOneTapSignIn(PluginCall call) {
        try {
            var signInResult = beginSignIn(true).get();
            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = beginSignIn(false).get();
            }
            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = googleSilentSignIn(call).get();
            }
            call.resolve(convertToJsonResult(signInResult));
        } catch (ExecutionException | InterruptedException e) {
            call.reject(e.toString());
        }
    }

    @PluginMethod()
    public void tryAutoSignIn(PluginCall call) {
        try {
            var signInResult = beginSignIn(true).get();
            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = googleSilentSignIn(call).get();
            }
            call.resolve(convertToJsonResult(signInResult));
        } catch (ExecutionException | InterruptedException e) {
            call.reject(e.toString());
        }
    }

    // This method is not part of the api but only called from GoogleOneTapAuth.ts in method renderSignInButton.
    @PluginMethod()
    public void triggerGoogleSignIn(PluginCall call) {
        try {
            var signInResult = googleSignIn(call).get();
            call.resolve(convertToJsonResult(signInResult));
        } catch (ExecutionException | InterruptedException e) {
            call.reject(e.toString());
        }
    }

    private JSObject convertToJsonResult(SignInResult signInResult) {
        var result = new JSObject();
        boolean isSuccess = signInResult.idToken != null;
        result.put("isSuccess", isSuccess);

        if (isSuccess) {
            var successObj = new JSObject();
            successObj.put("idToken", signInResult.idToken);
            result.put("success", successObj);
        }
        else {
            var errorObj = new JSObject();
            errorObj.put("noSuccessReasonCode", signInResult.noSuccessReasonCode);
            errorObj.put("noSuccessAdditionalInfo", signInResult.noSuccessAdditionalInfo);
            result.put("error", errorObj);
        }
        return result;
    }

    private Future<SignInResult> beginSignIn(boolean filterByAuthorizedAccounts) {
        var context = this.getContext();
        var beginSignInRequest = createBeginSignInRequest(filterByAuthorizedAccounts);
        oneTapSignInFuture = new CompletableFuture<>();

        oneTapClient.beginSignIn(beginSignInRequest)
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful()) {
                        var result = task.getResult();
                        var intentSender = result.getPendingIntent().getIntentSender();
                        var intentSenderRequest = new IntentSenderRequest.Builder(intentSender).build();
                        googleOneTapSignInActivityResultHandlerIntentSenderRequest.launch(intentSenderRequest);
                    } else {
                        Log.i(TAG, "beginSignIn with FilterByAuthorizedAccounts=" + filterByAuthorizedAccounts + " did not succeed.", task.getException());
                        var errorMessage = task.getException().toString();

                        if (!isGooglePlayServicesAvailable(context)) {
                            errorMessage += "\nGooglePlayService is not installed or must be updated.";
                        }
                        if (errorMessage.contains("Missing Feature{name=auth_api_credentials_begin_sign_in")) {
                            errorMessage += "\nGooglePlay is not installed or must be logged in to setup.";
                        }
                        if (errorMessage.contains("ApiException: 8")) {
                            errorMessage += "\nOne reason for the exception is when the device has no internet, or one-tap is not possible.";
                        }
                        // Other errors:
                        // com.google.android.gms.common.api.ApiException: 10: Caller not whitelisted to call this API.
                        // --> Try if restarting the phone fixes the problem.
                        // --> Test to sign in several times to ensure it works repeatedly.
                        oneTapSignInFuture.complete(createErrorResponse(null, errorMessage));
                    }
                });
        return oneTapSignInFuture;
    }

    private BeginSignInRequest createBeginSignInRequest(boolean filterByAuthorizedAccounts) {
        return BeginSignInRequest.builder()
                .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                        .setSupported(true)
                        .setNonce(nonce)
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

    private SignInResult createErrorResponse(String reasonCode, String noSuccessAdditionalInfo) {
        return new SignInResult(reasonCode, noSuccessAdditionalInfo);
    }

    private SignInResult createSuccessResponse(String idToken) {
        return new SignInResult(idToken);
    }

    private boolean isGooglePlayServicesAvailable(Context context) {
        var googleApiAvailability = GoogleApiAvailability.getInstance();
        int resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context);
        return resultCode == ConnectionResult.SUCCESS;
    }

    @PluginMethod()
    public void signOut(final PluginCall call) {
        oneTapClient.signOut()
                .addOnCompleteListener(task -> call.resolve(signOutResultTaskToJSObject(task)));
        googleSignInClient.signOut()
                .addOnCompleteListener(task -> call.resolve(signOutResultTaskToJSObject(task)));
    }

    private JSObject signOutResultTaskToJSObject(Task<Void> completedTask) {
        var signOutResult = new JSObject();
        if (completedTask.isSuccessful()) {
            signOutResult.put("isSuccess", true);
        } else {
            Log.e(TAG, "signOut failed", completedTask.getException());
            signOutResult.put("isSuccess", false);
            signOutResult.put("error", completedTask.getException().toString());
        }
        return signOutResult;
    }

    private Future<SignInResult> googleSilentSignIn(final PluginCall call) {
        googleSignInFuture = new CompletableFuture<>();
        googleSignInClient.silentSignIn()
                .addOnCompleteListener(task -> handleGoogleSignInResult(call, task, "silentSignIn"));
        return googleSignInFuture;
    }

    private Future<SignInResult> googleSignIn(final PluginCall call) {
        googleSignInFuture = new CompletableFuture<>();
        var intent = googleSignInClient.getSignInIntent();
        startActivityForResult(call, intent, "googleSignInResultIntentCallback");
        return googleSignInFuture;
    }

    @ActivityCallback
    private void googleSignInResultIntentCallback(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        Intent data = result.getData();
        var task = GoogleSignIn.getSignedInAccountFromIntent(data);
        handleGoogleSignInResult(call, task, "GoogleSignInClient.getSignInIntent");
    }

    private void handleGoogleSignInResult(PluginCall call, Task<GoogleSignInAccount> completedTask,
                                          String triggerMethodName) {
        try {
            var account = completedTask.getResult(ApiException.class);
            Log.i(TAG, triggerMethodName + " result " + account.toString());
            googleSignInFuture.complete(createSuccessResponse(account.getIdToken()));
        } catch (ApiException e) {
            int statusCode = e.getStatusCode();
            var statusCodeString = statusCode == GoogleSignInStatusCodes.SIGN_IN_CANCELLED
                    ? ReasonCodeSignInCancelled
                    : GoogleSignInStatusCodes.getStatusCodeString(statusCode);
            Log.i(TAG, triggerMethodName + " not successful, statusCodeString " + statusCodeString, e);
            if (statusCode == GoogleSignInStatusCodes.SIGN_IN_REQUIRED
                    || statusCode == GoogleSignInStatusCodes.SIGN_IN_CANCELLED) {
                googleSignInFuture.complete(createErrorResponse(statusCodeString, null));
            } else {
                googleSignInFuture.completeExceptionally(e);
            }
        }
    }
}
