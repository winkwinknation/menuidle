// The crafting bench ("Advanced → Build"): turn surplus resources into Keys and
// timed consumables. Costs SCALE with depth (a fixed number of "collects" worth) so
// they stay meaningful instead of trivializing as the economy grows.
import { Decimal } from '../math/bignum';
import { resourceValue } from '../generation/scaling';
import type { ResourceKind } from './resources';
import type { GameState } from '../state/types';

export type RecipeEffect = 'key' | 'ward' | 'surge';

export interface Recipe {
  id: string;
  name: string;
  desc: string;
  /** Cost weights in "collects worth" of each resource; scaled by depth at runtime. */
  inputs: Partial<Record<ResourceKind, number>>;
  effect: RecipeEffect;
  reveal: (s: GameState) => boolean;
}

export const WARD_MS = 180000; // 3 min of suppressed horror events
export const SURGE_MS = 120000; // 2 min of ×2 collection

export const RECIPES: Recipe[] = [
  {
    id: 'forge-key',
    name: 'Forge Access Key',
    desc: 'Synthesize one Access Key from spare resources.',
    inputs: { data: 18, packets: 18, tokens: 18 },
    effect: 'key',
    reveal: (s) => s.stats.maxDepth >= 8,
  },
  {
    id: 'dread-ward',
    name: 'Dread Ward',
    desc: 'Suppress horror events for 3 minutes.',
    inputs: { data: 30, tokens: 30 },
    effect: 'ward',
    reveal: (s) => s.stats.maxDepth >= 30,
  },
  {
    id: 'focus-surge',
    name: 'Focus Surge',
    desc: 'Double ALL active collection for 2 minutes.',
    inputs: { packets: 25, clicks: 120 },
    effect: 'surge',
    reveal: (s) => s.discovered.packets,
  },
];

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

/** Concrete cost per resource: weight × the value of one collect at this RUN's deepest tier.
 *  Uses runMaxDepth (not lifetime maxDepth) so crafting costs reset on prestige. */
export function recipeCost(s: GameState, r: Recipe): Partial<Record<ResourceKind, Decimal>> {
  const scale = resourceValue(s.stats.runMaxDepth);
  const out: Partial<Record<ResourceKind, Decimal>> = {};
  for (const [k, w] of Object.entries(r.inputs) as [ResourceKind, number][]) out[k] = scale.mul(w);
  return out;
}

export function canCraft(s: GameState, r: Recipe): boolean {
  const cost = recipeCost(s, r);
  return (Object.entries(cost) as [ResourceKind, Decimal][]).every(([k, c]) => s.resources[k].gte(c));
}
