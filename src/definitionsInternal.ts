import type { SuccessSignInResult, NoSuccessSignInResult, InitializeOptions } from './definitions';

/**
 * The options passed to the platform implementations.
 * isNonceFromApp is true if the app passed its own nonce, false if it was auto-generated.
 */
export type PlatformInitializeOptions = InitializeOptions & { isNonceFromApp: boolean };

export type NotEnrichedSuccessSignInResult = Omit<SuccessSignInResult, 'decodedIdToken' | 'userId' | 'email'>;
export interface NotEnrichedSignInResultOption {
  isSuccess: boolean;
  success?: NotEnrichedSuccessSignInResult;
  noSuccess?: NoSuccessSignInResult;
}
