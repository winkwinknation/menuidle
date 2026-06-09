// The Signal tether — a per-dive meter (not a currency) that dramatizes carry & bank.
// Full at the surface; drains while you are BELOW it, faster the deeper you go and over time.
// Refilled by deterministic Signal Booster items. At 0 you enter "Lost Signal": the carried haul
// bleeds and dread creeps until you climb back. Idle-safe — it only drains during active descent,
// so services/offline never touch it (Balanced playstyle). Tick logic lives in store.tick().
import type { GameState } from '../state/types';
import { derive } from '../content/upgrades';

/** Signal units drained per second at a given depth. The surface (0) never drains. */
export function signalDrainPerSec(depth: number): number {
  if (depth <= 0) return 0;
  return 0.5 + depth * 0.2; // deeper = faster bleed
}

/** Fraction of the carried haul lost per second while in Lost Signal. */
export const LOST_SIGNAL_BLEED_PER_SEC = 0.012;

/** How much one Signal Booster item restores, scaled so deep boosters matter more. */
export function boosterRefill(depth: number): number {
  return 25 + depth * 1.5;
}

export function signalMax(s: GameState): number {
  return derive(s).signalMax;
}

/** 0..1 for meters. */
export function signalFraction(s: GameState): number {
  const max = signalMax(s);
  return max <= 0 ? 0 : Math.max(0, Math.min(1, s.signal / max));
}

export function isLostSignal(s: GameState): boolean {
  return s.nav.length - 1 > 0 && s.signal <= 0;
}
