package com.proventask.capacitor.googleOneTapAuth

data class SignInResult(
    var idToken: String? = null,
    var noSuccessReasonCode: String? = null,
    var noSuccessAdditionalInfo: String? = null
) {
    constructor(noSuccessReasonCode: String?, noSuccessAdditionalInfo: String?) : this(
        null,
        noSuccessReasonCode,
        noSuccessAdditionalInfo
    )

    constructor(idToken: String?) : this(idToken, null, null)
}
