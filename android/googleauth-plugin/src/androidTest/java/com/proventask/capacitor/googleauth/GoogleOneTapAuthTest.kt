package com.proventask.capacitor.googleauth

import android.content.Context
import android.os.Bundle
import androidx.credentials.*
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.getcapacitor.PluginCall
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.*
import org.mockito.kotlin.isA
import org.mockito.kotlin.whenever
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Instrumented test, which will execute on an Android device.
 */
@RunWith(AndroidJUnit4::class)
class GoogleOneTapAuthTest {
    private lateinit var googleOneTapAuth: GoogleOneTapAuth
    private lateinit var mockContext: Context
    private lateinit var mockPluginCall: PluginCall
    private lateinit var mockCredentialManager: CredentialManager

    @Before
    fun setup() {
        googleOneTapAuth = GoogleOneTapAuth()
        mockCredentialManager = mock(CredentialManager::class.java)
        googleOneTapAuth.credentialManager = mockCredentialManager
        mockContext = ApplicationProvider.getApplicationContext<Context>()
        mockPluginCall = mock(PluginCall::class.java)
        googleOneTapAuth.contextProvider = {
            mockContext
        }
        googleOneTapAuth.idTokenFromCredential = { _: Credential ->
            "mock_token"
        }
        googleOneTapAuth.webClientId = "web_client_id"
        googleOneTapAuth.nonce = "nonce_value"
    }

    @Test
    fun testInitialize() {
        // Arrange
        `when`(mockPluginCall.getString("clientId")).thenReturn("web_client_id")
        `when`(mockPluginCall.getString("nonce")).thenReturn("nonce_value")

        // Act
        googleOneTapAuth.initialize(mockPluginCall)

        // Assert
        verify(mockPluginCall).resolve()
        assertEquals("web_client_id", googleOneTapAuth.webClientId)
        assertEquals("nonce_value", googleOneTapAuth.nonce)

        fail("Test github action.")
    }

    @Test
    fun testTryAutoOrOneTapSignIn() = runBlocking {
        // Arrange
        val latch = CountDownLatch(1)

        doAnswer { _ ->
            latch.countDown()
        }.whenever(mockPluginCall).resolve(any())

        `when`(mockCredentialManager.getCredential(isA<Context>(), isA<GetCredentialRequest>()))
            .thenReturn(createGetCredentialResponse())

        // Act
        googleOneTapAuth.tryAutoOrOneTapSignIn(mockPluginCall)

        // Wait for resolve to be called.
        latch.await(60 * 5, TimeUnit.SECONDS)

        // Assert
        verify(mockPluginCall).resolve(any())
    }

    private fun createGetCredentialResponse(): GetCredentialResponse {
        val credential = CustomCredential(GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL, Bundle.EMPTY)
        return GetCredentialResponse(credential)
    }
}
