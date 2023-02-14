export function assert(predicate: () => boolean, customMessage?: string) {
  if (!predicate()) {
    if (customMessage != undefined) {
      throw Error(customMessage);
    }
    throw Error(`Assert error, expected '${predicate}' to be true.`);
  }
}

export function randomHexString(length: number) {
  let uint8RandomNumbers = new Uint8Array((length / 2) + 1);
  uint8RandomNumbers = crypto.getRandomValues(uint8RandomNumbers);
  const numbersAsHexString = Array.from(uint8RandomNumbers).map(x => x.toString(16)).join('');
  return numbersAsHexString.substring(0, length);
}