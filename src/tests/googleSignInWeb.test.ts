/// <reference types="vitest" />

import { describe, beforeEach, test, expect, vi } from 'vitest';

const googleIdentity = vi.hoisted(() => ({
  signIn: vi.fn(),
  renderButton: vi.fn(),
  cancel: vi.fn(),
  disableAutoSelect: vi.fn(),
  revoke: vi.fn(),
  loadGis: vi.fn(() => Promise.resolve()),
}));

vi.mock('@madauth/google-identity', () => googleIdentity);

import { GoogleOneTapAuthWeb } from '../web/GoogleSignInWeb';

const clientId = 'your-client-id.apps.googleusercontent.com';

async function initializedWebPlugin() {
  const web = new GoogleOneTapAuthWeb();
  await web.initialize({ clientId, nonce: 'server-nonce' });
  return web;
}

describe('GoogleOneTapAuthWeb on @madauth/google-identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('tryAutoSignIn signs in with autoSelect and maps the token', async () => {
    googleIdentity.signIn.mockResolvedValueOnce({ isSuccess: true, idToken: 'id-token', isAutoSelected: true });
    const web = await initializedWebPlugin();

    const result = await web.tryAutoSignIn();

    expect(googleIdentity.signIn).toHaveBeenCalledWith(expect.objectContaining({ clientId, nonce: 'server-nonce', autoSelect: true }));
    expect(result).toEqual({ isSuccess: true, success: { idToken: 'id-token', isAutoSelected: true } });
  });

  test('tryAutoOrOneTapSignIn asks the user when auto sign-in was skipped', async () => {
    googleIdentity.signIn
      .mockResolvedValueOnce({ isSuccess: false, reason: 'skipped' })
      .mockResolvedValueOnce({ isSuccess: true, idToken: 'id-token', isAutoSelected: false });
    const web = await initializedWebPlugin();

    const result = await web.tryAutoOrOneTapSignIn();

    expect(googleIdentity.signIn).toHaveBeenCalledTimes(2);
    expect(googleIdentity.signIn).toHaveBeenLastCalledWith(expect.objectContaining({ autoSelect: false }));
    expect(result.isSuccess).toBe(true);
  });

  test('tryAutoOrOneTapSignIn does not ask again after the user cancelled', async () => {
    googleIdentity.signIn.mockResolvedValueOnce({ isSuccess: false, reason: 'cancelled' });
    const web = await initializedWebPlugin();

    const result = await web.tryAutoOrOneTapSignIn();

    expect(googleIdentity.signIn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ isSuccess: false, noSuccess: { noSuccessReasonCode: 'SIGN_IN_CANCELLED', noSuccessAdditionalInfo: undefined } });
  });

  test('keeps the reason and detail of other failures', async () => {
    googleIdentity.signIn.mockResolvedValueOnce({ isSuccess: false, reason: 'configuration_error', detail: 'unregistered_origin' });
    const web = await initializedWebPlugin();

    const result = await web.tryOneTapSignIn();

    expect(result).toEqual({ isSuccess: false, noSuccess: { noSuccessReasonCode: 'configuration_error', noSuccessAdditionalInfo: 'unregistered_origin' } });
  });

  test('renderSignInButton resolves with the first sign-in through the button', async () => {
    const container = {};
    vi.stubGlobal('document', { getElementById: vi.fn(() => container) });
    googleIdentity.renderButton.mockImplementationOnce(async (_container, options) => {
      setTimeout(() => options.onCredential({ idToken: 'id-token', isAutoSelected: false }));
      return { isSuccess: true, remove: vi.fn() };
    });
    const web = await initializedWebPlugin();

    const result = await web.renderSignInButton('button-div', { webOptions: { uxMode: 'popup' } }, { type: 'standard', width: 200 });

    expect(googleIdentity.renderButton).toHaveBeenCalledWith(container, expect.objectContaining({ clientId, nonce: 'server-nonce', uxMode: 'popup', button: { type: 'standard', width: 200 } }));
    expect(result).toEqual({ isSuccess: true, success: { idToken: 'id-token', isAutoSelected: false } });
    vi.unstubAllGlobals();
  });

  test('renderSignInButton resolves with the failure when the button cannot be rendered', async () => {
    vi.stubGlobal('document', { getElementById: vi.fn(() => ({})) });
    googleIdentity.renderButton.mockResolvedValueOnce({ isSuccess: false, reason: 'load_failed', detail: 'offline' });
    const web = await initializedWebPlugin();

    const result = await web.renderSignInButton('button-div', {});

    expect(result).toEqual({ isSuccess: false, noSuccess: { noSuccessReasonCode: 'load_failed', noSuccessAdditionalInfo: 'offline' } });
    vi.unstubAllGlobals();
  });

  test('signOut disables auto-select, disconnect revokes the user', async () => {
    googleIdentity.revoke.mockResolvedValueOnce({ isSuccess: true });
    const web = await initializedWebPlugin();

    expect(await web.signOut('user-id')).toEqual({ isSuccess: true });
    expect(googleIdentity.disableAutoSelect).toHaveBeenCalled();
    expect(await web.disconnect('user-id')).toEqual({ isSuccess: true });
    expect(googleIdentity.revoke).toHaveBeenCalledWith('user-id');
  });
});
