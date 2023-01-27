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
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;

@CapacitorPlugin()
public class GoogleOneTapAuth extends Plugin {
    private static final String TAG = "GoogleOneTapAuth Plugin";

    private String webClientId;
    private SignInClient oneTapClient;
    private BeginSignInRequest signInRequest;
    private CredentialsClient mCredentialsClient;
    private GoogleSignInClient mSignInClient;
    private String callbackId;
    private ActivityResultLauncher<IntentSenderRequest> googleOneTapSignInActivityResultHandlerIntentSenderRequest;

    @Override
    public void load() {
        webClientId = getConfig().getString("androidClientId");

        if (webClientId == null || webClientId.endsWith("apps.googleusercontent.com") == false) {
            throw new RuntimeException("clientId must ebd with 'apps.googleusercontent.com' but is: " + webClientId);
        }

        oneTapClient = Identity.getSignInClient(this.getActivity());
        mCredentialsClient = Credentials.getClient(this.getContext());
        var gsoBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(webClientId);
        mSignInClient = GoogleSignIn.getClient(this.getContext(), gsoBuilder.build());

        googleOneTapSignInActivityResultHandlerIntentSenderRequest = bridge.registerForActivityResult(
                new ActivityResultContracts.StartIntentSenderForResult(),
                result -> {
                    PluginCall savedCall = this.bridge.getSavedCall(callbackId);
                    var resultCode = result.getResultCode();
                    var resultCodeString = ActivityResult.resultCodeToString(resultCode);
                    Intent data = result.getData();

                    var pluginResult = new JSObject();
                    pluginResult.put("resultCodeString", resultCodeString);

                    if (resultCode == Activity.RESULT_OK) {
                        try {
                            var credential = oneTapClient.getSignInCredentialFromIntent(data);
                            var idToken = credential.getGoogleIdToken();
                            var id = credential.getId();
                            pluginResult.put("idToken", idToken);
                            pluginResult.put("id", id);
                            savedCall.resolve(pluginResult);
                        } catch (ApiException e) {
                            savedCall.reject(e.getMessage(), pluginResult);
                        }
                    } else {
                        savedCall.reject(resultCodeString, pluginResult);
                    }
                });
    }

    private class BeginSignInEventListener extends Activity
            implements OnSuccessListener<BeginSignInResult>, OnFailureListener {
        public BeginSignInEventListener(PluginCall call) {
            this.call = call;
        }

        private final PluginCall call;

        @Override
        public void onSuccess(BeginSignInResult result) {
            var intentSender = result.getPendingIntent().getIntentSender();
            var intentSenderRequest = new IntentSenderRequest.Builder(intentSender).build();
            googleOneTapSignInActivityResultHandlerIntentSenderRequest.launch(intentSenderRequest);
        }

        @Override
        public void onFailure(@NonNull Exception e) {
            Log.e(TAG, "beginSignIn failed", e);
            var errorMessage = e.toString();
            if (errorMessage.contains("ApiException: 8")) {
                errorMessage += "\nOne reason for the exception is when the device has no internet.";
            }
            call.reject(errorMessage);
        }
    }

    @PluginMethod()
    public void signIn(PluginCall call) {
        this.callbackId = call.getCallbackId();
        this.bridge.saveCall(call);

        final var activity = this.getActivity();

        if (activity == null) {
            call.reject("activity is null");
            return;
        }

        signInRequest = BeginSignInRequest.builder()
                .setGoogleIdTokenRequestOptions(BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                        .setSupported(true)
                        // Your server's client ID, not your Android client ID.
                        .setServerClientId(webClientId)
                        // Show all accounts on the device.
                        .setFilterByAuthorizedAccounts(false)
                        .build())
                .build();

        oneTapClient.beginSignIn(signInRequest)
                .addOnSuccessListener(new BeginSignInEventListener(call))
                .addOnFailureListener(new BeginSignInEventListener(call));
    }

    @PluginMethod()
    public void signOut(final PluginCall call) {
        oneTapClient.signOut();
        call.resolve();
    }
}
