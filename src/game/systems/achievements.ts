// Achievement definitions + checking. Each is a pure predicate over game state, so they
// can be evaluated cheaply every tick. Unlock IDs map 1:1 to future Steam achievements.
import type { GameState } from '../state/types';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  check: (s: GameState) => boolean;
}

const depthOf = (s: GameState) => s.nav.length - 1;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-descent', name: 'First Descent', desc: 'Enter your first submenu.', check: (s) => s.stats.maxDepth >= 1 },
  { id: 'tier-10', name: 'Going Deep', desc: 'Reach Tier 10.', check: (s) => s.stats.maxDepth >= 10 },
  { id: 'tier-30', name: 'Something Is Off', desc: 'Reach Tier 30.', check: (s) => s.stats.maxDepth >= 30 },
  { id: 'tier-60', name: 'It Notices You', desc: 'Reach Tier 60.', check: (s) => s.stats.maxDepth >= 60 },
  { id: 'tier-110', name: 'Wrong', desc: 'Reach Tier 110.', check: (s) => s.stats.maxDepth >= 110 },
  {
    id: 'lost',
    name: 'Lost in the Menus',
    desc: 'Be 5+ tiers deep with no Return charges left.',
    check: (s) => depthOf(s) >= 5 && s.returnCharges <= 0,
  },
  { id: 'combo-25', name: 'In the Zone', desc: 'Reach a 25-hit combo.', check: (s) => s.combo.count >= 25 },
  { id: 'collector', name: 'Compulsive', desc: 'Collect 1,000 things.', check: (s) => s.stats.totalCollects >= 1000 },
  {
    id: 'all-resources',
    name: 'Diversified',
    desc: 'Discover Data, Packets and Tokens.',
    check: (s) => s.discovered.data && s.discovered.packets && s.discovered.tokens,
  },
  { id: 'first-crawler', name: 'Delegation', desc: 'Hire your first Auto-Explorer.', check: (s) => (s.upgrades['crawler'] ?? 0) >= 1 },
  { id: 'fleet', name: 'A Whole Fleet', desc: 'Own 10 crawlers.', check: (s) => (s.upgrades['crawler'] ?? 0) >= 10 },
  { id: 'first-reboot', name: 'Reboot the System', desc: 'Reboot for the first time.', check: (s) => s.cache.gt(0) },
  { id: 'cache-100', name: 'Fragmented', desc: 'Hold 100 Cache at once.', check: (s) => s.cache.gte(100) },
  { id: 'millionaire', name: 'Click Tycoon', desc: 'Reach 1,000,000 Clicks.', check: (s) => s.resources.clicks.gte(1e6) },
];

export function newlyUnlocked(s: GameState, owned: Set<string>): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !owned.has(a.id) && a.check(s));
}
