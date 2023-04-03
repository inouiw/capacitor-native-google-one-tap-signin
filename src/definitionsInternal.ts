import type { SuccessSignInResult, NoSuccessSignInResult } from './definitions';

export type NotEnrichedSuccessSignInResult = Omit<SuccessSignInResult, 'decodedIdToken' | 'userId' | 'email'>;
export interface NotEnrichtedSignInResultOption {
  isSuccess: boolean;
  success?: NotEnrichedSuccessSignInResult;
  noSuccess?: NoSuccessSignInResult;
}
