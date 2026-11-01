/// <reference types="vitest" />

import { describe, beforeEach, test, expect, vi } from 'vitest';
import { signIn } from '@madauth/google-identity';
import { GoogleOneTapAuth } from '../GoogleSignIn';

const base64Url = (json: object) => Buffer.from(JSON.stringify(json)).toString('base64url');
const idToken = `${base64Url({ alg: 'none' })}.${base64Url({ sub: '123', email: 'user@example.com', nonce: 'sample_nonce' })}.signature`;

vi.mock('@madauth/google-identity', () => ({
  signIn: vi.fn(() => Promise.resolve({ isSuccess: true, idToken, isAutoSelected: false })),
  loadGis: vi.fn(() => Promise.resolve()),
}));

describe('GoogleSignIn - tryAutoOrOneTapSignIn', () => {
  beforeEach(async () => {
    await GoogleOneTapAuth.initialize({
      clientId: 'your-client-id.apps.googleusercontent.com',
      nonce: 'sample_nonce'
    });
  });

  test('should successfully sign in with tryAutoOrOneTapSignIn', async () => {
    const signInResult = await GoogleOneTapAuth.tryAutoOrOneTapSignIn();

    expect(signInResult.isSuccess).toBe(true);
    expect(signInResult.success).toMatchObject({ idToken, userId: '123', email: 'user@example.com' });
    expect(signInResult.success!.decodedIdToken.nonce).toBe('sample_nonce');
  });

  // Issue #25: closing the prompt, or a prompt the browser does not show, must call back instead of leaving the app waiting.
  test('calls back with SIGN_IN_CANCELLED when the user closes the prompt', async () => {
    vi.mocked(signIn).mockResolvedValueOnce({ isSuccess: false, reason: 'cancelled' });
    const onResult = vi.fn();

    await GoogleOneTapAuth.tryAutoOrOneTapSignInWithCallback(onResult);

    expect(onResult).toHaveBeenCalledWith({ isSuccess: false, noSuccess: { noSuccessReasonCode: 'SIGN_IN_CANCELLED', noSuccessAdditionalInfo: undefined } });
  });

  test('calls back with the reason when the browser does not show the prompt', async () => {
    vi.mocked(signIn)
      .mockResolvedValueOnce({ isSuccess: false, reason: 'skipped', detail: 'opt_out_or_no_session' })
      .mockResolvedValueOnce({ isSuccess: false, reason: 'skipped', detail: 'opt_out_or_no_session' });
    const onResult = vi.fn();

    await GoogleOneTapAuth.tryAutoOrOneTapSignInWithCallback(onResult);

    expect(onResult).toHaveBeenCalledWith({ isSuccess: false, noSuccess: { noSuccessReasonCode: 'skipped', noSuccessAdditionalInfo: 'opt_out_or_no_session' } });
  });
});
