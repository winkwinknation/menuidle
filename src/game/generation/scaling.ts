// Central tuning for value/cost curves. Keep balance knobs here (per the plan's
// "tune curves centrally in scaling.ts").
import { Decimal, D } from '../math/bignum';

/** Resource value grows exponentially with depth — the pull downward.
 *  Kept moderate so free descent is rewarding without being an instant jackpot. */
export const VALUE_GROWTH = 1.13;
/** A flat multiplier so early clicks read as satisfying whole-ish numbers. */
export const VALUE_BASE = 3;

export function resourceValue(depth: number, variance = 1): Decimal {
  return D(VALUE_BASE).mul(Decimal.pow(VALUE_GROWTH, depth)).mul(variance);
}

/** Horror resources are scarce and grow slowly — they are *counted*, not farmed in bulk. */
export function harvestValue(depth: number, variance = 1): Decimal {
  return D(1).mul(Decimal.pow(1.035, Math.max(0, depth))).mul(variance);
}

/** Standard idle cost curve: cost0 * mult^owned. */
export function upgradeCost(base: number, mult: number, level: number): Decimal {
  return D(base).mul(Decimal.pow(mult, level));
}

// ---- Overhaul tuning (services + signal) ----
/** Concurrent Background Service slots before upgrades. */
export const SERVICE_SLOTS_BASE = 3;
/** Signal tether capacity before upgrades. */
export const SIGNAL_MAX_BASE = 100;
/** Extra Signal capacity per `signal-cap` upgrade level. */
export const SIGNAL_PER_CAP = 25;

/** Combo multiplier from a streak count (1 → no bonus, capped). `extraMax` raises the cap (upgrades). */
export const COMBO_WINDOW_MS = 2000;
export const COMBO_STEP = 0.1;
export const COMBO_MAX = 5;
export function comboMult(count: number, extraMax = 0): number {
  if (count <= 1) return 1;
  return Math.min(1 + (count - 1) * COMBO_STEP, COMBO_MAX + extraMax);
}
