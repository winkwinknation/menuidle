// FNV-1a 32-bit string hash, used to turn a (worldSeed, path) pair into a PRNG seed.
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A menu's seed is a pure function of the world seed and its path — never stored. */
export function hashPath(worldSeed: number, path: number[]): number {
  return hashString(worldSeed.toString(36) + '|' + path.join('.'));
}
