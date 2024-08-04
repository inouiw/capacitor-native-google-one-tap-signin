package com.proventask.capacitor.googleauth

import android.content.Context
import android.util.Log
import androidx.credentials.*
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
import kotlinx.coroutines.*

@CapacitorPlugin
class GoogleOneTapAuth : Plugin() {
    private val TAG = "GoogleOneTapAuth Plugin"
    private val ReasonCodeSignInCancelled = "SIGN_IN_CANCELLED"
    private val ReasonCodeSignInInterrupted = "SIGN_IN_INTERRUPTED"
    private val ReasonCodeNoCredential = "NO_CREDENTIAL"
    var webClientId: String? = null
    var nonce: String? = null
    lateinit var credentialManager: CredentialManager
    // To remove dependencies on this.context in the code.
    lateinit var contextProvider: () -> Context
    // To remove dependencies on GoogleIdTokenCredential.createFrom in the code.
    lateinit var idTokenFromCredential: (credential: Credential) -> String

    override fun load() {
        credentialManager = CredentialManager.create(context)
        contextProvider = {
            this.context
        }
        idTokenFromCredential = { credential: Credential ->
            GoogleIdTokenCredential.createFrom(credential.data).idToken
        }
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        initializeOptionsFromCall(call)
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
        if (signInResult.idToken == null && signInResult.noSuccessReasonCode != ReasonCodeSignInInterrupted) {
            signInResult = signIn(filterByAuthorizedAccounts).await()
        }
        call.resolve(convertToJsonResult(signInResult))
    }

    private suspend fun signIn(filterByAuthorizedAccounts: Boolean): Deferred<SignInResult> {
        val googleIdOption = createGoogleIdOption(filterByAuthorizedAccounts)
        return launchGetCredentialRequest(googleIdOption)
    }

    private fun createGoogleIdOption(filterByAuthorizedAccounts: Boolean): GetGoogleIdOption {
        return GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
            .setServerClientId(webClientId!!)
            // Enable automatic sign-in for returning users that have not signed out.
            .setAutoSelectEnabled(true)
            .setNonce(nonce)
            .build()
    }

    private fun createSignInWithGoogleButtonOption(): GetSignInWithGoogleOption {
        // Trigger the Sign in with Google button flow.
        return GetSignInWithGoogleOption.Builder(webClientId!!)
            // .setHostedDomainFilter()
            .setNonce(nonce)
            .build()
    }

    private suspend fun launchGetCredentialRequest(credentialOption: CredentialOption): Deferred<SignInResult> {
        val googleSignInDeferred = CompletableDeferred<SignInResult>()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(credentialOption)
            .setPreferImmediatelyAvailableCredentials(true)
            .build()

        try {
            val result = credentialManager.getCredential(request = request, context = contextProvider())
            handleSignIn(googleSignInDeferred, result)
        } catch (e: GetCredentialCancellationException) {
            googleSignInDeferred.complete(errorSignInResult(ReasonCodeSignInCancelled, addClientIdInfo(e.message)))
        } catch (e: GetCredentialInterruptedException) { // should retry
            googleSignInDeferred.complete(errorSignInResult(ReasonCodeSignInInterrupted, e.message))
        } catch (e: NoCredentialException) {
            val filterByAuthorizedAccounts = (credentialOption as? GetGoogleIdOption)?.filterByAuthorizedAccounts ?: false
            googleSignInDeferred.complete(errorSignInResult(ReasonCodeNoCredential, "filterByAuthorizedAccounts: $filterByAuthorizedAccounts"))
        } catch (t: Throwable) {
            Log.w(TAG, "${t::class.java.simpleName} error in getCredential.", t)
            var errorMessage = addClientIdInfo(t.toString())
            if (!isGooglePlayServicesAvailable(contextProvider())) {
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
            googleSignInDeferred.complete(errorSignInResult(null, errorMessage))
        }
        return googleSignInDeferred
    }

    private fun addClientIdInfo(message: String?): String {
        val packageSha1 = AppSignatureHelper.getSHA1(contextProvider())
        val packageName = contextProvider().packageName
        var errorMessage = "Verify you have created a OAuth 2.0 Client ID of type 'Android' in the Google Cloud Console with Package name: '$packageName' and SHA-1 certificate fingerprint: '$packageSha1'"
        return "$errorMessage\n$message"
    }

    private fun handleSignIn(
        googleSignInDeferred: CompletableDeferred<SignInResult>,
        response: GetCredentialResponse
    ) {
        when (val credential = response.credential) {
            is CustomCredential -> {
                if (credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    try {
                        val idToken = idTokenFromCredential(credential)
                        googleSignInDeferred.complete(successSignInResult(idToken))
                    } catch (e: GoogleIdTokenParsingException) {
                        Log.e(TAG, "Received an invalid google id token response", e)
                        googleSignInDeferred.completeExceptionally(e)
                    }
                } else {
                    Log.e(TAG, "Unexpected CustomCredential type of credential")
                    googleSignInDeferred.completeExceptionally(Exception("Unexpected CustomCredential type: " + credential.type))
                }
            }
            else -> {
                Log.e(TAG, "Unexpected type of credential")
                googleSignInDeferred.completeExceptionally(Exception("Unexpected type of credential: " + credential.type))
            }
        }
    }

    @PluginMethod
    fun signInWithGoogleButtonFlowForNativePlatform(call: PluginCall) {
        GlobalScope.launch {
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

    @PluginMethod
    fun disconnect(call: PluginCall) {
        signOut(call)
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

    private fun successSignInResult(idToken: String): SignInResult {
        return SignInResult(idToken, null, null)
    }
    private fun errorSignInResult(noSuccessReasonCode: String?, noSuccessAdditionalInfo: String?): SignInResult {
        return SignInResult(null, noSuccessReasonCode, noSuccessAdditionalInfo)
    }
}

data class SignInResult(
    val idToken: String?,
    val noSuccessReasonCode: String?,
    val noSuccessAdditionalInfo: String?
)
