/// <reference types="vitest" />

import { describe, beforeEach, test, expect, vi } from 'vitest';
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
});
