import type { NoSuccessSignInResult, SignOutResult } from '../definitions';
import type { NotEnrichedSuccessSignInResult } from '../definitionsInternal';

export interface IAuthClient {
  signIn(autoSelect: boolean, clientId: string, nonce?: string): Promise<NotEnrichedSuccessSignInResult | NoSuccessSignInResult>;
  signOut(authenticatedUserId: string | undefined): Promise<SignOutResult>;
  cancel(): void;
}