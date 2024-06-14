package com.proventask.capacitor.googleOneTapAuth

import android.content.Context
import android.util.Log
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialOption
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.NoCredentialException
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch


@CapacitorPlugin
class GoogleOneTapAuth : Plugin() {
    private val TAG = "GoogleOneTapAuth Plugin"
    private val ReasonCodeSignInCancelled = "SIGN_IN_CANCELLED"
    private val ReasonCodeSignInInterrupted = "SIGN_IN_INTERRUPTED"
    private val ReasonCodeNoCredential = "NO_CREDENTIAL"
    private var webClientId: String? = null
    private var nonce: String? = null
    private lateinit var credentialManager: CredentialManager

    override fun load() {
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        initializeOptionsFromCall(call)
        credentialManager = CredentialManager.create(context)
        call.resolve()
    }

    private fun initializeOptionsFromCall(call: PluginCall) {
        // This must be the Client ID of type Web application NOT the Android Client ID.
        webClientId = call.getString("clientId")
        nonce = call.getString("nonce")
    }

    @PluginMethod
    fun tryAutoOrOneTapSignIn(call: PluginCall) {
        GlobalScope.launch {
            var signInResult = signIn(true).await()

            if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInCancelled) {
                signInResult = signIn(false).await()
            }
            call.resolve(convertToJsonResult(signInResult))
        }
    }

    @PluginMethod
    fun tryAutoSignIn(call: PluginCall) {
        GlobalScope.launch {
            signIn(call, true)
        }
    }

    @PluginMethod
    fun tryOneTapSignIn(call: PluginCall) {
        GlobalScope.launch {
            signIn(call, false)
        }
    }

    // For sign-up, set filterByAuthorizedAccounts to false.
    private suspend fun signIn(call: PluginCall, filterByAuthorizedAccounts: Boolean) {
        var signInResult = signIn(filterByAuthorizedAccounts).await()
        if (signInResult.idToken == null && signInResult.noSuccessReasonCode !== ReasonCodeSignInInterrupted) {
            signInResult = signIn(filterByAuthorizedAccounts).await()
        }
        call.resolve(convertToJsonResult(signInResult))
    }

    private suspend fun signIn(filterByAuthorizedAccounts: Boolean): Deferred<SignInResult> {
        val googleIdOption = createGoogleIdOption(filterByAuthorizedAccounts)
        return launchGetCredentialRequest(googleIdOption)
    }

    private fun createGoogleIdOption(filterByAuthorizedAccounts: Boolean): GetGoogleIdOption {
        val googleIdOption: GetGoogleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
            .setServerClientId(this.webClientId!!)
            // Enable automatic sign-in for returning users that have not signed out.
            .setAutoSelectEnabled(true)
            .setNonce(this.nonce)
            .build();
        return googleIdOption;
    }

    private fun createSignInWithGoogleButtonOption(): GetSignInWithGoogleOption {
        // Trigger the Sign in with Google button flow.
        val signInWithGoogleOption = GetSignInWithGoogleOption.Builder(webClientId!!)
            // .setHostedDomainFilter()
            .setNonce(nonce)
            .build()
        return signInWithGoogleOption;
    }

    private suspend fun launchGetCredentialRequest(credentialOption: CredentialOption): Deferred<SignInResult> {
        val googleSignInDeferred = CompletableDeferred<SignInResult>()
        val request: GetCredentialRequest = GetCredentialRequest.Builder()
            .addCredentialOption(credentialOption)
            .setPreferImmediatelyAvailableCredentials(true)
            .build()

        try {
            val result = credentialManager.getCredential(request = request, context = this.context)
            handleSignIn(googleSignInDeferred, result)
        } catch (e: GetCredentialCancellationException) {
            googleSignInDeferred.complete(SignInResult(ReasonCodeSignInCancelled, e.message))
        } catch (e: GetCredentialInterruptedException) { // should retry
            googleSignInDeferred.complete(SignInResult(ReasonCodeSignInInterrupted, e.message))
        } catch (e: NoCredentialException) {
            var filterByAuthorizedAccounts = (credentialOption as? GetGoogleIdOption)?.filterByAuthorizedAccounts ?: false;
            googleSignInDeferred.complete(SignInResult(ReasonCodeNoCredential, "filterByAuthorizedAccounts: $filterByAuthorizedAccounts"))
        } catch (t: Throwable) { // GetCredentialException
            val exceptionType = t::class.java.simpleName
            val errorMsg = "$exceptionType error in getCredential."
            Log.i(TAG, errorMsg, t)
            var errorMessage = t.toString()

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
            googleSignInDeferred.complete(SignInResult(null, errorMessage))
        }
        return googleSignInDeferred;
    }

    private fun handleSignIn(
        googleSignInDeferred: CompletableDeferred<SignInResult>,
        response: GetCredentialResponse
    ) {
        when (val credential = response.credential) {
            // GoogleIdToken credential
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val googleIdTokenCredential =
                            GoogleIdTokenCredential.createFrom(credential.data)
                        googleSignInDeferred.complete(SignInResult(googleIdTokenCredential.idToken))
                    } catch (e: GoogleIdTokenParsingException) {
                        Log.e(TAG, "Received an invalid google id token response", e)
                        googleSignInDeferred.completeExceptionally(e)
                    }
                } else {
                    // Catch any unrecognized custom credential type here.
                    Log.e(TAG, "Unexpected CustomCredential type of credential")
                    googleSignInDeferred.completeExceptionally(Exception("Unexpected CustomCredential type: " + credential.type))
                }
            }
            else -> {
                // Catch any unrecognized credential type here.
                Log.e(TAG, "Unexpected type of credential")
                googleSignInDeferred.completeExceptionally(Exception("Unexpected type of credential: " + credential.type))
            }
        }
    }

    // This method is not part of the api but only called from GoogleOneTapAuth.ts in method renderSignInButton.
    @PluginMethod
    fun triggerGoogleSignIn(call: PluginCall) {
        GlobalScope.launch {
            // Trigger the Sign in with Google button flow.
            val signInWithGoogleOption = createSignInWithGoogleButtonOption()
            val signInResult = launchGetCredentialRequest(signInWithGoogleOption).await()
            call.resolve(convertToJsonResult(signInResult))
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
            result.put("noSuccess", errorObj)
        }
        return result
    }

    private fun isGooglePlayServicesAvailable(context: Context): Boolean {
        val googleApiAvailability = GoogleApiAvailability.getInstance()
        val resultCode = googleApiAvailability.isGooglePlayServicesAvailable(context)
        return resultCode == ConnectionResult.SUCCESS
    }

    @PluginMethod
    fun cancelOneTapDialog(call: PluginCall) {
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        GlobalScope.launch {
            try {
                credentialManager.clearCredentialState(ClearCredentialStateRequest())
                call.resolve(createSuccessSignOutResult())
            } catch (e: ClearCredentialException) {
                call.resolve(createErrorSignOutResult(e.toString()))
            }
        }
    }

    private fun createSuccessSignOutResult(): JSObject {
        val signOutResult = JSObject()
        signOutResult.put("isSuccess", true)
        return signOutResult
    }

    private fun createErrorSignOutResult(errorMessage: String): JSObject {
        val signOutResult = JSObject()
        signOutResult.put("isSuccess", false)
        signOutResult.put("error", errorMessage)
        return signOutResult
    }
}