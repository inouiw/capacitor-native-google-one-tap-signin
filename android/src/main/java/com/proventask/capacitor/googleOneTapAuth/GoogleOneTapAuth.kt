package com.proventask.capacitor.googleOneTapAuth

import android.app.Activity
import android.content.Context
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.credentials.GetCredentialRequest
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ExecutionException
import java.util.concurrent.Future

@CapacitorPlugin
class GoogleOneTapAuth : Plugin() {
    private val TAG = "GoogleOneTapAuth Plugin"
    private val ReasonCodeSignInCancelled = "SIGN_IN_CANCELLED"
    private var clientId: String? = null
    private var nonce: String? = null
    private lateinit var signInClient: SignInClient
    private lateinit var googleOneTapSignInActivityResultHandlerIntentSenderRequest: ActivityResultLauncher<IntentSenderRequest>
    private lateinit var oneTapSignInFuture: CompletableFuture<SignInResult>
    private lateinit var googleSignInFuture: CompletableFuture<SignInResult>

    override fun load() {
        registerSignInResultHandler()
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        initializeOptionsFromCall(call)
        signInClient = Identity.getSignInClient(activity)
        call.resolve()
    }

    private fun initializeOptionsFromCall(call: PluginCall) {
        // This must be the Client ID of type Web application NOT the Android Client ID.
        clientId = call.getString("clientId")
        nonce = call.getString("nonce")
    }

    private fun registerSignInResultHandler() {
        googleOneTapSignInActivityResultHandlerIntentSenderRequest = bridge.registerForActivityResult(
            ActivityResultContracts.StartIntentSenderForResult()
        ) { result ->
            val resultCode = result.resultCode

            if (resultCode == Activity.RESULT_OK) {
                try {
                    val data = result.data
                    val credential = signInClient.getSignInCredentialFromIntent(data)
                    oneTapSignInFuture.complete(createSuccessResponse(credential.googleIdToken))
                } catch (e: ApiException) {
                    oneTapSignInFuture.complete(createErrorResponse(null, e.toString()))
                }
            } else {
                val reasonCode = if (resultCode == Activity.RESULT_CANCELED) ReasonCodeSignInCancelled else null
                val resultCodeString = ActivityResult.resultCodeToString(resultCode)
                oneTapSignInFuture.complete(createErrorResponse(reasonCode, resultCodeString))
            }
        }
    }

    @PluginMethod
    fun tryAutoOrOneTapSignIn(call: PluginCall) {
        try {
            var signInResult = beginSignIn(true).get()
            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = beginSignIn(false).get()
            }
            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = googleSilentSignIn(call).get()
            }
            call.resolve(convertToJsonResult(signInResult))
        } catch (e: ExecutionException) {
            call.reject(e.toString())
        } catch (e: InterruptedException) {
            call.reject(e.toString())
        }
    }

    @PluginMethod
    fun tryOneTapSignIn(call: PluginCall) {
        signIn(call, false)
    }

    @PluginMethod
    fun tryAutoSignIn(call: PluginCall) {
        signIn(call, true)
    }

    private fun signIn(call: PluginCall, filterByAuthorizedAccounts: Boolean) {
        try {
            var signInResult = beginSignIn(filterByAuthorizedAccounts).get()
            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = googleSilentSignIn(call).get()
            }
            call.resolve(convertToJsonResult(signInResult))
        } catch (e: ExecutionException) {
            call.reject(e.toString())
        } catch (e: InterruptedException) {
            call.reject(e.toString())
        }
    }

   // This method is not part of the api but only called from GoogleOneTapAuth.ts in method renderSignInButton.
    @PluginMethod
    fun triggerGoogleSignIn(call: PluginCall) {
        try {
            val signInResult = googleSignIn(call).get()
            call.resolve(convertToJsonResult(signInResult))
        } catch (e: ExecutionException) {
            call.reject(e.toString())
        } catch (e: InterruptedException) {
            call.reject(e.toString())
        }
    }

    private fun convertToJsonResult(signInResult: SignInResult): JSObject {
        val result = JSObject()
        val isSuccess = signInResult.idToken != null
        result.put("isSuccess", isSuccess)

        if (isSuccess) {
            val successObj = JSObject()
            successObj.put("idToken", signInResult.idToken)
            result.put("success", successObj)
        } else {
            val errorObj = JSObject()
            errorObj.put("noSuccessReasonCode", signInResult.noSuccessReasonCode)
            errorObj.put("noSuccessAdditionalInfo", signInResult.noSuccessAdditionalInfo)
            result.put("error", errorObj)
        }
        return result
    }

    private fun beginSignIn(filterByAuthorizedAccounts: Boolean): Future<SignInResult> {
        val context = context
        val beginSignInRequest = createBeginSignInRequest(filterByAuthorizedAccounts)
        oneTapSignInFuture = CompletableFuture()

        signInClient.beginSignIn(beginSignInRequest)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val result = task.result
                    val intentSender = result.pendingIntent.intentSender
                    val intentSenderRequest = IntentSenderRequest.Builder(intentSender).build()
                    googleOneTapSignInActivityResultHandlerIntentSenderRequest.launch(intentSenderRequest)
                } else {
                    Log.i(TAG, "beginSignIn with FilterByAuthorizedAccounts=$filterByAuthorizedAccounts did not succeed.", task.exception)
                    var errorMessage = task.exception.toString()

                    if (!isGooglePlayServicesAvailable(context)) {
                        errorMessage += "\nGooglePlayService is not installed or must be updated."
                    }
                    if (errorMessage.contains("Missing Feature{name=auth_api_credentials_begin_sign_in")) {
                        errorMessage += "\nGooglePlay is not installed or must be logged in to setup."
                    }
                    if (errorMessage.contains("ApiException: 8")) {
                        errorMessage += "\nOne reason for the exception is when the device has no internet, or one-tap is not possible."
                    }
                    // Other errors:
                    // com.google.android.gms.common.api.ApiException: 10: Caller not whitelisted to call this API.
                    // --> Try if restarting the phone fixes the problem.
                    // --> Test to sign in several times to ensure it works repeatedly.
                    oneTapSignInFuture.complete(createErrorResponse(null, errorMessage))
                }
            }
        return oneTapSignInFuture
    }

    private fun createBeginSignInRequest(filterByAuthorizedAccounts: Boolean): BeginSignInRequest {
        return BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
                BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                    .setSupported(true)
                    .setNonce(nonce) // A OAuth client ID with application type "Web application".
                    .setServerClientId(clientId!!) // If true, only the Google accounts that the user has authorized before will show up in the credential list. This can
                    .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
                    .build()
            ) // For users who opt-in, Auto Select allows a credential to be selected automatically without waiting for a user action (such as tapping on the "continue" button).
            .setAutoSelectEnabled(true)
            .build()
    }

    private fun createErrorResponse(reasonCode: String?, noSuccessAdditionalInfo: String?): SignInResult {
        return SignInResult(reasonCode, noSuccessAdditionalInfo)
    }

    private fun createSuccessResponse(idToken: String?): SignInResult {
        return SignInResult(idToken)
    }

    private fun isGooglePlayServicesAvailable(context: Context): Boolean {
        val googleApiAvailability = GoogleApiAvailability.getInstance()
        val resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context)
        return resultCode == ConnectionResult.SUCCESS
    }

    @PluginMethod
    fun cancelOneTapDialog(call: PluginCall) {}

    @PluginMethod
    fun signOut(call: PluginCall) {
        signInClient.signOut()
            .addOnCompleteListener { task -> call.resolve(signOutResultTaskToJSObject(task)) }
    }

    private fun signOutResultTaskToJSObject(completedTask: Task<Void>): JSObject {
        val signOutResult = JSObject()
        if (completedTask.isSuccessful) {
            signOutResult.put("isSuccess", true)
        } else {
            Log.e(TAG, "signOut failed", completedTask.exception)
            signOutResult.put("isSuccess", false)
            signOutResult.put("error", completedTask.exception.toString())
        }
        return signOutResult
    }

    private fun googleSilentSignIn(call: PluginCall): Future<SignInResult> {
        googleSignInFuture = CompletableFuture()
        // googleSignInClient.silentSignIn()
        //     .addOnCompleteListener { task -> handleGoogleSignInResult(call, task, "silentSignIn") }
        return googleSignInFuture
    }

    private fun googleSignIn(call: PluginCall): Future<SignInResult> {
        googleSignInFuture = CompletableFuture()

        val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(clientId!!)
            .setNonce(nonce)
            .build()

        val getCredRequest = GetCredentialRequest.Builder()
            .addCredentialOption(signInWithGoogleOption)
            .build()

        // GetCredentialRequest getCredentialRequest = new GetCredentialRequest.Builder()
        //     .setSupportedCredentialIds(Collections.singletonList(SignInOptions.DEFAULT_SIGN_IN))
        //     .build()

        // var intent = googleSignInClient.getSignInIntent()
        // startActivityForResult(call, intent, "googleSignInResultIntentCallback")
        // GetSignInWithGoogleOption signInWithGoogleOption = GetSignInWithGoogleOption.Builder()
        //     .setServerClientId(this.clientId)
        //     .setNonce(this.nonce)
        //     .build()

        return googleSignInFuture
    }
}