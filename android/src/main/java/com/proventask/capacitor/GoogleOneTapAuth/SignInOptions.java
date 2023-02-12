package com.proventask.capacitor.GoogleOneTapAuth;

public class SignInOptions {
    public String clientId;
    public String nonce;

    public SignInOptions(String clientId, String nonce) {
        this.clientId = clientId;
        this.nonce = nonce;
    }
}
