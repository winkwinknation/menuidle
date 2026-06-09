// Shared label helpers. Theme vocabularies now live in themes.ts; this file keeps the
// generic bits: per-menu uniqueness and the faint "uncanny" drift that creeps in at depth.
import { pick } from './prng';

export const HOME_LABELS = [
  'Return to Main Menu', 'Back to Start', 'Top of Tree', 'Return to Surface', 'Exit to Root',
];

const UNCANNY_SUFFIX = [' (Recommended)', ' (do not change)', ' (for now)', ' (again)', ' (?)'];

/** Faint wrongness once you are deep enough (B1 uncanny). */
export function maybeUncanny(rng: () => number, depth: number, name: string): string {
  if (depth >= 12 && rng() < 0.18) return name + pick(rng, UNCANNY_SUFFIX);
  return name;
}

/**
 * Produce a label unique within the current menu. `gen` is re-rolled on collision;
 * a numeric qualifier is the (rare) last resort if a small pool can't fill a big menu.
 */
export function uniqueLabel(rng: () => number, used: Set<string>, gen: () => string): string {
  for (let i = 0; i < 16; i++) {
    const cand = gen();
    if (!used.has(cand)) {
      used.add(cand);
      return cand;
    }
  }
  const base = gen();
  let cand = base;
  let n = 2;
  while (used.has(cand)) cand = `${base} (${n++})`;
  used.add(cand);
  return cand;
}
