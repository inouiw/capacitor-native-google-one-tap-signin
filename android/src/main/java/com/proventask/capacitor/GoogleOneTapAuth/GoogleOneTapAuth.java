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
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

@CapacitorPlugin()
public class GoogleOneTapAuth extends Plugin {
    private enum SignInMethod {NotSignedIn, OneTap, GoogleSignIn}
    private static final String TAG = "GoogleOneTapAuth Plugin";
    private String clientId;
    private SignInClient oneTapClient;
    private GoogleSignInClient googleSignInClient;
    private ActivityResultLauncher<IntentSenderRequest> googleOneTapSignInActivityResultHandlerIntentSenderRequest;
    private CompletableFuture<JSObject> oneTapSignInFuture;
    private CompletableFuture<JSObject> googleSignInFuture;
    private SignInMethod signInMethod = SignInMethod.NotSignedIn;

    @Override
    public void load() {
        clientId = getConfig().getString("clientId");

        if (clientId == null || clientId.endsWith("apps.googleusercontent.com") == false) {
            throw new RuntimeException("clientId must end with 'apps.googleusercontent.com' but is: " + clientId + ". Check capacitor.config.ts.");
        }
        oneTapClient = Identity.getSignInClient(this.getActivity());
        RegisterSignInResultHandler();

        var gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestEmail()
                .requestIdToken(clientId)
                .build();
        googleSignInClient = GoogleSignIn.getClient(this.getActivity(), gso);
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
                            signInMethod = SignInMethod.OneTap;
                            oneTapSignInFuture.complete(createSuccessResponse(credential.getGoogleIdToken()));
                        } catch (ApiException e) {
                            oneTapSignInFuture.complete(createErrorResponse(e.toString()));
                        }
                    } else {
                        var resultCodeString = ActivityResult.resultCodeToString(resultCode);
                        oneTapSignInFuture.complete(createErrorResponse(resultCodeString));
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
            if (!signInResult.getBool("isSuccess")) {
                signInResult = googleSignIn(call).get();
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
                            errorMessage += "\nOne reason for the exception is when the device has no internet.";
                        }
                        // Other errors:
                        // com.google.android.gms.common.api.ApiException: 10: Caller not whitelisted to call this API.
                        // --> Try if restarting the phone fixes the problem.
                        // --> Test to sign in several times to ensure it works repeatedly.
                        oneTapSignInFuture.complete(createErrorResponse(errorMessage));
                    }
                });
        return oneTapSignInFuture;
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

    private JSObject createSuccessResponse(String idToken) {
        var decodedIdToken = decodeJwtBody(idToken);
        JSONObject decodedIdTokenJson = null;
        String userId = null;
        String email = null;
        try {
            decodedIdTokenJson = new JSONObject(decodedIdToken);
            userId = decodedIdTokenJson.getString("sub");
            email = decodedIdTokenJson.getString("email");
        } catch (JSONException e) {
            // Do nothing.
        }
        var result = new JSObject();
        result.put("isSuccess", true);
        result.put("idToken", idToken);
        result.put("userId", userId);
        result.put("email", email);
        result.put("decodedIdToken", decodedIdToken);
        return result;
    }

    private String decodeJwtBody(String jwtToken) {
        var parts = jwtToken.split("\\.");
        var payloadJson = new String(android.util.Base64.decode(parts[1], android.util.Base64.DEFAULT));
        return payloadJson;
    }

    private boolean isGooglePlayServicesAvailable(Context context) {
        var googleApiAvailability = GoogleApiAvailability.getInstance();
        int resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context);
        return resultCode == ConnectionResult.SUCCESS;
    }

    @PluginMethod()
    public void signOut(final PluginCall call) {
        if (signInMethod == SignInMethod.OneTap) {
            oneTapClient.signOut()
                    .addOnCompleteListener(task -> {
                        call.resolve(signOutResultTaskToJSObject(task));
                    });
        } else if (signInMethod == SignInMethod.GoogleSignIn) {
            googleSignInClient.revokeAccess()
                    .addOnCompleteListener(task -> {
                        call.resolve(signOutResultTaskToJSObject(task));
                    });
        } else {
            call.resolve(createSuccessResult());
        }
    }

    private JSObject signOutResultTaskToJSObject(Task<Void> task) {
        var signOutResult = new JSObject();
        if (task.isSuccessful()) {
            signOutResult.put("isSuccess", true);
        } else {
            Log.e(TAG, "signOut failed", task.getException());
            signOutResult.put("isSuccess", false);
            signOutResult.put("error", task.getException().toString());
        }
        return signOutResult;
    }

    private JSObject createSuccessResult() {
        var jsObject = new JSObject();
        jsObject.put("isSuccess", true);
        return jsObject;
    }

    private Future<JSObject> googleSignIn(final PluginCall call) {
        googleSignInFuture = new CompletableFuture<>();
        var intent = googleSignInClient.getSignInIntent();
        startActivityForResult(call, intent, "googleSignInResult");
        return googleSignInFuture;
    }

    @ActivityCallback
    private void googleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        Intent data = result.getData();
        var task = GoogleSignIn.getSignedInAccountFromIntent(data);

        try {
            var account = task.getResult(ApiException.class);
            signInMethod = SignInMethod.GoogleSignIn;
            Log.i(TAG, "googleSignInResult" + account.toString());
            googleSignInFuture.complete(createSuccessResponse(account.getIdToken()));
        } catch (ApiException e) {
            Log.e(TAG, "googleSignInResult failed", e);
            call.reject(e.toString());
        }
    }
}
