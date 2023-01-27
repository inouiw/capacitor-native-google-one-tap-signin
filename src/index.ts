import { registerPlugin } from '@capacitor/core';
import type { GoogleOneTapAuthPlugin } from './definitions';

const GoogleOneTapAuth = registerPlugin<GoogleOneTapAuthPlugin>('GoogleOneTapAuth', {
  web: () => import('./web').then((m) => new m.GoogleOneTapAuthWeb()),
});

export * from './definitions';
export { GoogleOneTapAuth };
