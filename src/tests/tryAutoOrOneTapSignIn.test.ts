/// <reference types="vitest" />

import { describe, beforeEach, test, expect, vi } from 'vitest';
import { GoogleOneTapAuth } from '../GoogleSignIn';
import { GoogleOneTapAuthWeb } from '../web/GoogleSignInWeb';

// import * as helpers from '../helpers';

vi.mock('../helpers', async () => {
  const actual = await vi.importActual<typeof import('../helpers')>('../helpers');
  return {
    ...actual,
    loadScript: vi.fn(() => Promise.resolve()),
  };
});

describe('GoogleSignIn - tryAutoOrOneTapSignIn', () => {
  let googleOneTapAuthWeb: GoogleOneTapAuthWeb;

  beforeEach(async () => {
    googleOneTapAuthWeb = new GoogleOneTapAuthWeb();
    
    await GoogleOneTapAuth.initialize({
      clientId: 'your-client-id.apps.googleusercontent.com',
      nonce: 'sample_nonce'
    });
  });

  test('should successfully sign in with tryAutoOrOneTapSignIn', async () => {
    const signInResult = await GoogleOneTapAuth.tryAutoOrOneTapSignIn();

    expect(signInResult).toBeDefined();
  });
});
