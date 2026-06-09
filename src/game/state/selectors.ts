// Small read-helpers for the UI. Keep components selecting narrow slices.
import type { GameState, NavLevel } from './types';
import { derive, effectiveCost, UPGRADES, type UpgradeDef } from '../content/upgrades';
import { comboMult } from '../generation/scaling';

export const depth = (s: GameState): number => s.nav.length - 1;
export const currentLevel = (s: GameState): NavLevel => s.nav[s.nav.length - 1];
export const currentComboMult = (s: GameState): number => comboMult(s.combo.count);

export { derive };

/** Upgrades the player can currently SEE (reveal gate passed). */
export function visibleUpgrades(s: GameState): UpgradeDef[] {
  return UPGRADES.filter((u) => u.reveal(s));
}

export function canAfford(s: GameState, u: UpgradeDef): boolean {
  const level = s.upgrades[u.id] ?? 0;
  if (u.max != null && level >= u.max) return false;
  if (u.requires && !u.requires.every((r) => (s.upgrades[r] ?? 0) >= 1)) return false;
  if (u.unlock && !u.unlock(s)) return false;
  return s.resources[u.costResource].gte(effectiveCost(s, u));
}

/** A node is buyable if its prereqs are owned (used by the skill tree to lock/unlock nodes). */
export function requiresMet(s: GameState, u: UpgradeDef): boolean {
  return !u.requires || u.requires.every((r) => (s.upgrades[r] ?? 0) >= 1);
}

/** Display names for each level of the path. Level 0 is always the Main Menu. */
export function breadcrumbNames(nav: GameState['nav']): string[] {
  const names = ['Main Menu'];
  for (let i = 1; i < nav.length; i++) {
    const parent = nav[i - 1];
    const childIndex = nav[i].data.path[i - 1];
    names.push(parent.data.items[childIndex]?.label ?? '???');
  }
  return names;
}
