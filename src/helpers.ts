import type { NoSuccessSignInResult, SignInResultOption, SuccessSignInResult } from "./definitions";
import type { NotEnrichedSuccessSignInResult, NotEnrichedSignInResultOption } from "./definitionsInternal";

export function assert(predicate: () => boolean, customMessage?: string): void {
  if (!predicate()) {
    const callerName = callingFunctionName();
    if (customMessage != undefined) {
      throw Error(customMessage + `. Error in ${callerName}.`);
    }
    throw Error(`Assert error, expected '${predicate}' to be true. Error in ${callerName}.`);
  }
}

export function randomHexString(length: number): string {
  let uint8RandomNumbers = new Uint8Array((length / 2) + 1);
  uint8RandomNumbers = crypto.getRandomValues(uint8RandomNumbers);
  const numbersAsHexString = Array.from(uint8RandomNumbers).map(x => x.toString(16)).join('');
  return numbersAsHexString.substring(0, length);
}

function callingFunctionName() {
  try {
    return (new Error()).stack?.split("\n")[3].trim().split(" ")[1];
  }
  catch {
    // ignore.
  }
}

export function loadScript(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const scriptEl = document.createElement('script') as HTMLScriptElement;
    scriptEl.async = true;
    scriptEl.onerror = () => reject();
    scriptEl.onload = () => resolve();
    scriptEl.src = url;
    document.getElementsByTagName('head')[0].appendChild(scriptEl);
  });
}

export function toSignInResultOption(signInResult: SuccessSignInResult | NoSuccessSignInResult): SignInResultOption {
  if ((signInResult as SuccessSignInResult).idToken) {
    return {
      isSuccess: true,
      success: signInResult as SuccessSignInResult
    }
  } else {
    return {
      isSuccess: false,
      noSuccess: signInResult as NoSuccessSignInResult
    }
  }
}

export function toNotEnrichedSignInResultOption(signInResult: NotEnrichedSuccessSignInResult | NoSuccessSignInResult): NotEnrichedSignInResultOption {
  if ((signInResult as SuccessSignInResult).idToken) {
    return {
      isSuccess: true,
      success: signInResult as NotEnrichedSuccessSignInResult
    }
  } else {
    return {
      isSuccess: false,
      noSuccess: signInResult as NoSuccessSignInResult
    }
  }
}