export function assert(predicate: () => boolean) {
  if (!predicate()) {
    throw Error(`Assert error, expected '${predicate}' to be true.`);
  }
}