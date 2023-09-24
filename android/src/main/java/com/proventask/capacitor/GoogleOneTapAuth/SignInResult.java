package com.proventask.capacitor.GoogleOneTapAuth;

public class SignInResult {
    public String idToken;
    public String noSuccessReasonCode;
    public String noSuccessAdditionalInfo;

    public SignInResult(String noSuccessReasonCode, String noSuccessAdditionalInfo) {
        this.noSuccessReasonCode = noSuccessReasonCode;
        this.noSuccessAdditionalInfo = noSuccessAdditionalInfo;
    }

    public SignInResult(String idToken) {
        this.idToken = idToken;
    }
}
