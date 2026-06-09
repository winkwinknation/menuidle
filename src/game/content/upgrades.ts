// The upgrade pool, now a branching SKILL TREE. Data-driven so it can keep growing.
// Each node has a `branch`, a layout `pos`, and `requires` (prereq node ids). Two-stage gating:
// `reveal` controls when a node APPEARS; `requires` + affordability + optional `unlock` control when
// it can be BOUGHT. Costs can be paid in any resource and are scaled by the global cost multiplier.
import { Decimal, D } from '../math/bignum';
import {
  upgradeCost,
  SERVICE_SLOTS_BASE,
  SIGNAL_MAX_BASE,
  SIGNAL_PER_CAP,
} from '../generation/scaling';
import type { ResourceKind } from './resources';
import type { GameState } from '../state/types';

export type UpgradeBranch =
  | 'Collection'
  | 'Navigation'
  | 'Signal'
  | 'Automation'
  | 'Insight'
  | 'Resonance';

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  branch: UpgradeBranch;
  pos: { x: number; y: number }; // tree layout (abstract grid units)
  requires?: string[]; // prereq node ids (all must be owned to buy)
  costResource: ResourceKind;
  baseCost: number;
  costMult: number;
  max?: number;
  cost: (level: number) => Decimal;
  reveal: (s: GameState) => boolean;
  unlock?: (s: GameState) => boolean;
}

function def(d: Omit<UpgradeDef, 'cost'>): UpgradeDef {
  return { ...d, cost: (level: number) => upgradeCost(d.baseCost, d.costMult, level) };
}

const lv = (s: GameState, id: string) => s.upgrades[id] ?? 0;
const owns = (s: GameState, id: string) => (s.upgrades[id] ?? 0) >= 1;

export const UPGRADES: UpgradeDef[] = [
  // ---------------- Collection ----------------
  def({
    id: 'click-power',
    name: 'Heavier Clicks',
    description: '+60% to the value of everything you collect.',
    branch: 'Collection',
    pos: { x: 0, y: 0 },
    costResource: 'clicks',
    baseCost: 15,
    costMult: 2.1,
    reveal: () => true,
  }),
  def({
    id: 'deep-yield',
    name: 'Pressure Harvest',
    description: '+4% collection for every tier below the surface — the deep pays better.',
    branch: 'Collection',
    pos: { x: 0, y: 1 },
    requires: ['click-power'],
    costResource: 'clicks',
    baseCost: 120,
    costMult: 1.9,
    max: 20,
    reveal: (s) => owns(s, 'click-power'),
  }),
  def({
    id: 'combo-window',
    name: 'Steady Hands',
    description: '+0.3s to the combo window — keep streaks alive longer.',
    branch: 'Collection',
    pos: { x: -0.7, y: 2 },
    requires: ['deep-yield'],
    costResource: 'clicks',
    baseCost: 200,
    costMult: 1.8,
    max: 6,
    reveal: (s) => owns(s, 'deep-yield'),
  }),
  def({
    id: 'combo-cap',
    name: 'Overdrive',
    description: '+0.5 to the maximum combo multiplier.',
    branch: 'Collection',
    pos: { x: 0.7, y: 2 },
    requires: ['deep-yield'],
    costResource: 'clicks',
    baseCost: 350,
    costMult: 2.0,
    max: 6,
    reveal: (s) => owns(s, 'deep-yield'),
  }),
  def({
    id: 'data-cruncher',
    name: 'Data Cruncher',
    description: '+25% to ALL collection. Spends the Data you find in Settings menus.',
    branch: 'Collection',
    pos: { x: 1.4, y: 1 },
    requires: ['click-power'],
    costResource: 'data',
    baseCost: 8,
    costMult: 1.5,
    reveal: (s) => s.discovered.data,
  }),
  def({
    id: 'token-index',
    name: 'Token Index',
    description: '+20% to ALL collection. Spends Tokens pulled from Dropdown menus.',
    branch: 'Collection',
    pos: { x: 1.4, y: 2 },
    requires: ['data-cruncher'],
    costResource: 'tokens',
    baseCost: 10,
    costMult: 1.6,
    reveal: (s) => s.discovered.tokens,
  }),

  // ---------------- Navigation ----------------
  def({
    id: 'return-charge',
    name: 'Spare Charge',
    description: '+1 max Return charge — each one climbs (and banks) once more before recharging.',
    branch: 'Navigation',
    pos: { x: 3, y: 0 },
    costResource: 'clicks',
    baseCost: 25,
    costMult: 1.9,
    max: 15,
    reveal: (s) => s.stats.maxDepth >= 1,
  }),
  def({
    id: 'regen-speed',
    name: 'Faster Recovery',
    description: 'Return charges regenerate 15% faster.',
    branch: 'Navigation',
    pos: { x: 2.4, y: 1 },
    requires: ['return-charge'],
    costResource: 'clicks',
    baseCost: 50,
    costMult: 1.6,
    max: 15,
    reveal: (s) => lv(s, 'return-charge') >= 1,
  }),
  def({
    id: 'return-reach',
    name: 'Longer Reach',
    description: '+1 tier climbed per Back press — extract your haul and bank it faster.',
    branch: 'Navigation',
    pos: { x: 3.6, y: 1 },
    requires: ['return-charge'],
    costResource: 'clicks',
    baseCost: 150,
    costMult: 2.6,
    max: 8,
    reveal: (s) => s.stats.maxDepth >= 3,
  }),
  def({
    id: 'bank-bonus',
    name: 'Skim the Take',
    description: '+8% bonus resources whenever you bank a haul by climbing.',
    branch: 'Navigation',
    pos: { x: 3.6, y: 2 },
    requires: ['return-reach'],
    costResource: 'clicks',
    baseCost: 400,
    costMult: 1.85,
    max: 12,
    reveal: (s) => lv(s, 'return-reach') >= 1,
  }),
  def({
    id: 'packet-buffer',
    name: 'Packet Buffer',
    description: '+1 maximum Return charge. Spends Packets gathered from Grid menus.',
    branch: 'Navigation',
    pos: { x: 2.4, y: 2 },
    requires: ['regen-speed'],
    costResource: 'packets',
    baseCost: 6,
    costMult: 2.0,
    max: 6,
    reveal: (s) => s.discovered.packets,
  }),

  // ---------------- Signal ----------------
  def({
    id: 'signal-cap',
    name: 'Signal Reserve',
    description: `+${SIGNAL_PER_CAP} Signal capacity — dive deeper before you lose the tether.`,
    branch: 'Signal',
    pos: { x: 5, y: 0 },
    costResource: 'clicks',
    baseCost: 90,
    costMult: 1.7,
    max: 20,
    reveal: (s) => s.stats.maxDepth >= 2,
  }),
  def({
    id: 'signal-steady',
    name: 'Shielded Cable',
    description: 'Signal drains 10% slower at every depth.',
    branch: 'Signal',
    pos: { x: 4.4, y: 1 },
    requires: ['signal-cap'],
    costResource: 'clicks',
    baseCost: 160,
    costMult: 1.8,
    max: 12,
    reveal: (s) => lv(s, 'signal-cap') >= 1,
  }),
  def({
    id: 'booster-yield',
    name: 'Amplifier',
    description: '+25% Signal restored by each Signal Boost you collect.',
    branch: 'Signal',
    pos: { x: 5.6, y: 1 },
    requires: ['signal-cap'],
    costResource: 'data',
    baseCost: 14,
    costMult: 1.6,
    max: 12,
    reveal: (s) => lv(s, 'signal-cap') >= 1,
  }),
  def({
    id: 'signal-anchor',
    name: 'Anchor Line',
    description: 'Lost Signal bleeds your haul 20% slower — more time to climb out.',
    branch: 'Signal',
    pos: { x: 4.4, y: 2 },
    requires: ['signal-steady'],
    costResource: 'data',
    baseCost: 24,
    costMult: 1.7,
    max: 8,
    reveal: (s) => lv(s, 'signal-steady') >= 1,
  }),

  // ---------------- Automation ----------------
  def({
    id: 'service-slots',
    name: 'More Background Slots',
    description: '+1 concurrent Background Service.',
    branch: 'Automation',
    pos: { x: 7.6, y: 0 },
    costResource: 'data',
    baseCost: 20,
    costMult: 2.2,
    max: 9,
    reveal: (s) => s.stats.maxDepth >= 2,
  }),
  def({
    id: 'service-power',
    name: 'Optimized Services',
    description: '+15% output from every Background Service.',
    branch: 'Automation',
    pos: { x: 7.6, y: 1 },
    requires: ['service-slots'],
    costResource: 'data',
    baseCost: 30,
    costMult: 1.7,
    max: 15,
    reveal: (s) => lv(s, 'service-slots') >= 1,
  }),
  def({
    id: 'offline-cap',
    name: 'Persistence',
    description: '+2 hours to how long services and crawlers run while you are away.',
    branch: 'Automation',
    pos: { x: 7.6, y: 2 },
    requires: ['service-power'],
    costResource: 'data',
    baseCost: 60,
    costMult: 1.9,
    max: 8,
    reveal: (s) => lv(s, 'service-power') >= 1,
  }),
  def({
    id: 'crawler',
    name: 'Auto-Explorer',
    description: 'A crawler that wanders the menus on its own, bringing back Clicks every second.',
    branch: 'Automation',
    pos: { x: 6.4, y: 0 },
    costResource: 'clicks',
    baseCost: 160,
    costMult: 1.55,
    reveal: (s) => s.stats.maxDepth >= 4,
  }),
  def({
    id: 'crawler-yield',
    name: 'Crawler Training',
    description: '+30% to all crawler output.',
    branch: 'Automation',
    pos: { x: 6.4, y: 1 },
    requires: ['crawler'],
    costResource: 'clicks',
    baseCost: 500,
    costMult: 1.7,
    reveal: (s) => (s.upgrades['crawler'] ?? 0) >= 1,
  }),
  def({
    id: 'crawler-depth',
    name: 'Deep Crawlers',
    description: 'Crawlers exploit your depth harder — more output the deeper you have been.',
    branch: 'Automation',
    pos: { x: 6.4, y: 2 },
    requires: ['crawler-yield'],
    costResource: 'packets',
    baseCost: 20,
    costMult: 1.8,
    max: 15,
    reveal: (s) => (s.upgrades['crawler-yield'] ?? 0) >= 1,
  }),

  // ---------------- Insight ----------------
  def({
    id: 'efficiency',
    name: 'Cost Analysis',
    description: 'All upgrades cost 5% less (compounding).',
    branch: 'Insight',
    pos: { x: 9, y: 0 },
    costResource: 'data',
    baseCost: 18,
    costMult: 2.3,
    max: 12,
    reveal: (s) => s.stats.maxDepth >= 3,
  }),
  def({
    id: 'appraise',
    name: 'Appraiser',
    description: 'See the exact value of resource nodes before you collect them.',
    branch: 'Insight',
    pos: { x: 8.4, y: 1 },
    requires: ['efficiency'],
    costResource: 'data',
    baseCost: 40,
    costMult: 1,
    max: 1,
    reveal: (s) => owns(s, 'efficiency'),
  }),
  def({
    id: 'cartographer',
    name: 'Cartographer',
    description: 'The Dive Gauge reveals landmarks waiting on the path below.',
    branch: 'Insight',
    pos: { x: 9.6, y: 1 },
    requires: ['efficiency'],
    costResource: 'tokens',
    baseCost: 30,
    costMult: 1,
    max: 1,
    reveal: (s) => owns(s, 'efficiency'),
  }),
  def({
    id: 'insight-mult',
    name: 'Synthesis',
    description: '+15% to ALL collection. The reward for understanding the System.',
    branch: 'Insight',
    pos: { x: 9, y: 2 },
    requires: ['appraise', 'cartographer'],
    costResource: 'tokens',
    baseCost: 60,
    costMult: 1.7,
    max: 10,
    reveal: (s) => owns(s, 'efficiency'),
  }),

  // ---------------- Resonance (dread-tech) ----------------
  def({
    id: 'attune',
    name: 'Attune',
    description: 'Stop fighting the Interference. Collection scales with current Interference.',
    branch: 'Resonance',
    pos: { x: 11, y: 0 },
    costResource: 'static',
    baseCost: 4,
    costMult: 1.7,
    max: 10,
    reveal: (s) => s.discovered.static,
  }),
  def({
    id: 'channel',
    name: 'Channel',
    description: 'Open the channel wider — a steeper bonus from Interference.',
    branch: 'Resonance',
    pos: { x: 10.4, y: 1 },
    requires: ['attune'],
    costResource: 'static',
    baseCost: 8,
    costMult: 1.8,
    max: 10,
    reveal: (s) => owns(s, 'attune'),
  }),
  def({
    id: 'embrace',
    name: 'Embrace',
    description: '+20% to ALL collection, unconditionally. It feels warmer now.',
    branch: 'Resonance',
    pos: { x: 11.6, y: 1 },
    requires: ['attune'],
    costResource: 'sigils',
    baseCost: 6,
    costMult: 1.7,
    max: 10,
    reveal: (s) => s.discovered.sigils,
  }),
  def({
    id: 'feedback',
    name: 'Feedback Loop',
    description: 'Background Services run harder the higher the Interference climbs.',
    branch: 'Resonance',
    pos: { x: 11, y: 2 },
    requires: ['channel'],
    costResource: 'viscera',
    baseCost: 5,
    costMult: 1.8,
    max: 10,
    reveal: (s) => s.discovered.viscera,
  }),
  def({
    id: 'communion',
    name: 'Communion',
    description: '+50% to ALL collection. You stop thinking of them as the dead.',
    branch: 'Resonance',
    pos: { x: 11, y: 3 },
    requires: ['embrace', 'feedback'],
    costResource: 'names',
    baseCost: 4,
    costMult: 2.0,
    max: 8,
    reveal: (s) => s.discovered.names,
  }),
  def({
    id: 'devour',
    name: 'Devour',
    description: '×2 to ALL collection. You stopped counting whose marrow this was.',
    branch: 'Resonance',
    pos: { x: 11, y: 4 },
    requires: ['communion'],
    costResource: 'marrow',
    baseCost: 6,
    costMult: 2.2,
    max: 5,
    reveal: (s) => owns(s, 'communion'),
  }),

  // ---------------- extra deep nodes ----------------
  def({
    id: 'overclock',
    name: 'Overclock',
    description: '+30% to ALL collection. Runs the System hotter than it likes.',
    branch: 'Collection',
    pos: { x: -0.7, y: 3 },
    requires: ['combo-window'],
    costResource: 'clicks',
    baseCost: 2000,
    costMult: 2.3,
    max: 12,
    reveal: (s) => owns(s, 'combo-window'),
  }),
  def({
    id: 'swarm',
    name: 'Swarm Protocol',
    description: '+50% crawler output per level — release more of them into the deep.',
    branch: 'Automation',
    pos: { x: 6.4, y: 3 },
    requires: ['crawler-depth'],
    costResource: 'packets',
    baseCost: 40,
    costMult: 1.9,
    max: 10,
    reveal: (s) => (s.upgrades['crawler-depth'] ?? 0) >= 1,
  }),
];

export const UPGRADES_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

/** Upgrades that raise the Return charge maximum (so a purchase can refill instantly). */
export const CHARGE_CAP_UPGRADES = ['return-charge', 'packet-buffer'];

export interface DerivedEffects {
  collectMult: Decimal;
  maxCharges: number;
  reach: number;
  regenMs: number;
  serviceSlots: number;
  signalMax: number;
  serviceMult: number; // ×Background Service output
  signalDrainMult: number; // ×Signal drain rate (<1 is slower)
  boosterMult: number; // ×Signal Boost refill
  bleedMult: number; // ×Lost-Signal bleed (<1 is gentler)
  bankBonus: number; // +fraction of bonus resources when banking
  offlineCapMs: number; // how long idle income accrues while away
  deepYieldPer: number; // +fraction collection per tier of depth
  comboWindowMs: number;
  comboMaxBonus: number;
  costMult: number; // ×upgrade cost (<1 is cheaper)
  resonanceMult: number; // ×active collection, scales with current Dread (Resonance branch)
}

const BASE_REGEN_MS = 12000;
const BASE_OFFLINE_MS = 8 * 60 * 60 * 1000;
const BASE_COMBO_WINDOW_MS = 2000;

// Per-level multipliers for the collection upgrades. click-power is intentionally a
// moderate ×1.6 (not ×2) with a steeper cost curve, so it self-limits instead of dominating.
const CLICK_POWER_MULT = 1.6;

/** The single source of truth for the global collection multiplier (used by derive + UI). */
export function collectMultiplier(
  upgrades: Record<string, number>,
  prestige: Record<string, number>,
): Decimal {
  const u = (id: string) => upgrades[id] ?? 0;
  const p = (id: string) => prestige[id] ?? 0;
  return Decimal.pow(CLICK_POWER_MULT, u('click-power'))
    .mul(Decimal.pow(1.25, u('data-cruncher')))
    .mul(Decimal.pow(1.2, u('token-index')))
    .mul(Decimal.pow(1.15, u('insight-mult')))
    .mul(Decimal.pow(1.3, u('overclock')))
    .mul(Decimal.pow(1.2, u('embrace'))) // Resonance: unconditional collection
    .mul(Decimal.pow(1.5, u('communion')))
    .mul(Decimal.pow(2, u('devour')))
    .mul(Decimal.pow(1.1, p('effigy'))) // permanent effigies (Ritual)
    .mul(Decimal.pow(1.25, p('p-mult')));
}

/** Resolve owned upgrade levels (run + permanent prestige) into gameplay effects. */
export function derive(s: GameState): DerivedEffects {
  const pl = (id: string) => s.prestigeUpgrades[id] ?? 0;
  return {
    collectMult: collectMultiplier(s.upgrades, s.prestigeUpgrades),
    maxCharges: 1 + lv(s, 'return-charge') + lv(s, 'packet-buffer') + pl('p-charges'),
    reach: 1 + lv(s, 'return-reach'),
    regenMs: BASE_REGEN_MS * Math.pow(0.85, lv(s, 'regen-speed')) * Math.pow(0.9, pl('p-regen')),
    serviceSlots: SERVICE_SLOTS_BASE + lv(s, 'service-slots') + pl('p-slots'),
    signalMax: SIGNAL_MAX_BASE + (lv(s, 'signal-cap') + pl('p-signal')) * SIGNAL_PER_CAP,
    serviceMult:
      (1 + 0.15 * lv(s, 'service-power')) *
      (1 + 0.1 * pl('p-service')) *
      (1 + (s.dread / 100) * 0.5 * lv(s, 'feedback')), // Resonance: Interference drives services
    signalDrainMult: Math.pow(0.9, lv(s, 'signal-steady')),
    boosterMult: 1 + 0.25 * lv(s, 'booster-yield'),
    bleedMult: Math.pow(0.8, lv(s, 'signal-anchor')),
    bankBonus: 0.08 * lv(s, 'bank-bonus'),
    offlineCapMs: BASE_OFFLINE_MS + lv(s, 'offline-cap') * 2 * 60 * 60 * 1000,
    deepYieldPer: 0.04 * lv(s, 'deep-yield'),
    comboWindowMs: BASE_COMBO_WINDOW_MS + 300 * lv(s, 'combo-window'),
    comboMaxBonus: 0.5 * lv(s, 'combo-cap'),
    costMult: Math.pow(0.95, lv(s, 'efficiency')),
    resonanceMult: 1 + (s.dread / 100) * (0.6 * lv(s, 'attune') + 0.8 * lv(s, 'channel')),
  };
}

/** Concrete cost of a node at its current level, after the global cost multiplier. */
export function effectiveCost(s: GameState, dfn: UpgradeDef): Decimal {
  const level = s.upgrades[dfn.id] ?? 0;
  return dfn.cost(level).mul(derive(s).costMult);
}
