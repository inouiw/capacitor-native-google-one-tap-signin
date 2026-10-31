/// <reference types="vitest" />

import { describe, beforeEach, test, expect, vi } from 'vitest';

// Capacitor keeps the registered platform instance across module resets, so all instances share this mock.
const platformInitialize = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('../web/GoogleSignInWeb', () => ({
  GoogleOneTapAuthWeb: class {
    initialize = platformInitialize;
  },
}));

const clientId = 'your-client-id.apps.googleusercontent.com';

// GoogleOneTapAuth is a singleton, so each test imports a fresh module.
async function importPlugin() {
  vi.resetModules();
  const { GoogleOneTapAuth } = await import('../GoogleSignIn');
  return GoogleOneTapAuth;
}

describe('GoogleSignIn - initialize nonce', () => {
  beforeEach(() => {
    platformInitialize.mockClear();
  });

  test('passes an app nonce to the platform with isNonceFromApp true', async () => {
    const googleOneTapAuth = await importPlugin();
    await googleOneTapAuth.initialize({ clientId, nonce: 'server-nonce-1' });

    expect(platformInitialize).toHaveBeenCalledTimes(1);
    expect(platformInitialize).toHaveBeenLastCalledWith(expect.objectContaining({ nonce: 'server-nonce-1', isNonceFromApp: true }));
    expect(googleOneTapAuth.getNonce()).toBe('server-nonce-1');
  });

  test('passes a generated nonce to the platform with isNonceFromApp false', async () => {
    const googleOneTapAuth = await importPlugin();
    await googleOneTapAuth.initialize({ clientId });

    expect(platformInitialize).toHaveBeenLastCalledWith(expect.objectContaining({ nonce: googleOneTapAuth.getNonce(), isNonceFromApp: false }));
  });

  test('passes a new nonce of a later initialize to the platform', async () => {
    const googleOneTapAuth = await importPlugin();
    void googleOneTapAuth.initialize({ clientId, nonce: 'server-nonce-1' });
    await googleOneTapAuth.initialize({ clientId, nonce: 'server-nonce-2' });

    expect(platformInitialize).toHaveBeenCalledTimes(2);
    expect(platformInitialize).toHaveBeenLastCalledWith(expect.objectContaining({ nonce: 'server-nonce-2', isNonceFromApp: true }));
    expect(googleOneTapAuth.getNonce()).toBe('server-nonce-2');
  });

  test('does not initialize the platform again for the same nonce', async () => {
    const googleOneTapAuth = await importPlugin();
    await googleOneTapAuth.initialize({ clientId, nonce: 'server-nonce-1' });
    await googleOneTapAuth.initialize({ clientId, nonce: 'server-nonce-1' });

    expect(platformInitialize).toHaveBeenCalledTimes(1);
  });
});
