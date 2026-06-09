// Rituals — what you spend the dark resources on. Offerings appease the entity, sigil-rites surge
// your take, effigies trade the dead (Names) for permanent power (and a more complete copy of you),
// and Severance is the way out — the trigger for the endgame. Costs scale with depth.
import { Decimal } from '../math/bignum';
import { harvestValue } from '../generation/scaling';
import type { ResourceKind } from './resources';
import type { GameState } from '../state/types';

export type RitualEffect = 'ward' | 'surge' | 'effigy' | 'severance';

export interface Ritual {
  id: string;
  name: string;
  desc: string;
  inputs: Partial<Record<ResourceKind, number>>; // weights in "harvests worth"; scaled by depth
  effect: RitualEffect;
  reveal: (s: GameState) => boolean;
}

export const RITUAL_WARD_MS = 5 * 60 * 1000; // 5 min of suppressed horror events
export const RITUAL_SURGE_MS = 3 * 60 * 1000; // 3 min of ×2 collection
export const SEVERANCE_REPLACEMENT = 80; // the copy must be near-complete to cut loose

export const RITUALS: Ritual[] = [
  {
    id: 'offering',
    name: 'Offering',
    desc: 'Feed it something other than you. Horror events are suppressed for 5 minutes.',
    inputs: { viscera: 6 },
    effect: 'ward',
    reveal: (s) => s.discovered.viscera,
  },
  {
    id: 'sigil-rite',
    name: 'Sigil Rite',
    desc: 'Burn marked entries for a surge: double ALL collection for 3 minutes.',
    inputs: { sigils: 8 },
    effect: 'surge',
    reveal: (s) => s.discovered.sigils,
  },
  {
    id: 'effigy',
    name: 'Build an Effigy',
    desc: 'Spend Names to raise a permanent effigy: +10% collection forever. It completes the copy a little.',
    inputs: { names: 5 },
    effect: 'effigy',
    reveal: (s) => s.discovered.names,
  },
  {
    id: 'severance',
    name: 'Severance',
    desc: 'Cut yourself loose from the System. Requires Marrow and a near-complete copy. There is no undo.',
    inputs: { marrow: 10 },
    effect: 'severance',
    reveal: (s) => s.discovered.marrow,
  },
];

export const RITUAL_BY_ID: Record<string, Ritual> = Object.fromEntries(RITUALS.map((r) => [r.id, r]));

export function ritualCost(s: GameState, r: Ritual): Partial<Record<ResourceKind, Decimal>> {
  const scale = harvestValue(s.stats.maxDepth);
  const out: Partial<Record<ResourceKind, Decimal>> = {};
  for (const [k, w] of Object.entries(r.inputs) as [ResourceKind, number][]) out[k] = scale.mul(w);
  return out;
}

export function canPerform(s: GameState, r: Ritual): boolean {
  if (r.effect === 'severance' && s.replacement < SEVERANCE_REPLACEMENT) return false;
  const cost = ritualCost(s, r);
  return (Object.entries(cost) as [ResourceKind, Decimal][]).every(([k, c]) => s.resources[k].gte(c));
}
