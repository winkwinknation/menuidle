// Prestige ("Reboot the System"): the legitimate way back to the top. Resets the dive
// for Cache Fragments, which buy permanent multipliers that survive every reboot.
import { Decimal, D } from '../math/bignum';
import { upgradeCost, SIGNAL_PER_CAP } from '../generation/scaling';

/** Cache earned for rebooting, scaled by the deepest tier reached THIS run. */
export function cacheFor(runMaxDepth: number): Decimal {
  if (runMaxDepth < MIN_REBOOT_DEPTH) return D(0);
  return D(Math.floor(Math.pow(runMaxDepth / 10, 1.6)));
}

export const MIN_REBOOT_DEPTH = 10;

export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  costMult: number;
  max?: number;
  cost: (level: number) => Decimal;
}

function pdef(d: Omit<PrestigeUpgradeDef, 'cost'>): PrestigeUpgradeDef {
  return { ...d, cost: (level: number) => upgradeCost(d.baseCost, d.costMult, level) };
}

export const PRESTIGE_UPGRADES: PrestigeUpgradeDef[] = [
  pdef({
    id: 'p-mult',
    name: 'Persistent Cache',
    description: '+25% to ALL collection. Survives every reboot.',
    baseCost: 1,
    costMult: 1.8,
  }),
  pdef({
    id: 'p-charges',
    name: 'Deep Memory',
    description: '+1 base maximum Return charge — you start every run a little freer.',
    baseCost: 3,
    costMult: 2.5,
    max: 5,
  }),
  pdef({
    id: 'p-regen',
    name: 'Muscle Memory',
    description: 'Return charges recover 10% faster, permanently.',
    baseCost: 2,
    costMult: 2.0,
    max: 10,
  }),
  pdef({
    id: 'p-slots',
    name: 'Standing Processes',
    description: '+1 base Background Service slot. Survives every reboot.',
    baseCost: 4,
    costMult: 3,
    max: 4,
  }),
  pdef({
    id: 'p-service',
    name: 'Entrenched',
    description: '+10% Background Service output, permanently.',
    baseCost: 3,
    costMult: 2.0,
    max: 10,
  }),
  pdef({
    id: 'p-signal',
    name: 'Deep Antenna',
    description: `+${SIGNAL_PER_CAP} base Signal capacity, permanently.`,
    baseCost: 2,
    costMult: 1.8,
    max: 10,
  }),
];

export const PRESTIGE_BY_ID: Record<string, PrestigeUpgradeDef> = Object.fromEntries(
  PRESTIGE_UPGRADES.map((u) => [u.id, u]),
);
