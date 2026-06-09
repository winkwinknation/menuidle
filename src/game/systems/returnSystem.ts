// Pure helpers for the signature "Return economy" mechanic.
import type { GameState } from '../state/types';
import { derive } from '../content/upgrades';

export function depthOf(s: GameState): number {
  return s.nav.length - 1;
}

export function canGoBack(s: GameState): boolean {
  return depthOf(s) > 0 && s.returnCharges > 0;
}

/** How many tiers a single Back press would climb right now. */
export function climbAmount(s: GameState): number {
  return Math.min(derive(s).reach, depthOf(s));
}
