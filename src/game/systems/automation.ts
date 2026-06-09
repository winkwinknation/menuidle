// Crawlers: the idle layer. Auto-Explorers that wander the menus and bring back
// Clicks on their own, scaling with how deep you've been and your multipliers.
import { Decimal, D } from '../math/bignum';
import { derive } from '../content/upgrades';
import type { GameState } from '../state/types';

/** Base Clicks/sec per crawler before yield, depth and global multipliers. */
export const CRAWLER_BASE = 0.4;

export function crawlerCount(s: GameState): number {
  return s.upgrades['crawler'] ?? 0;
}

/** Total crawler production, in Clicks per second. */
export function crawlerRate(s: GameState): Decimal {
  const count = crawlerCount(s);
  if (count <= 0) return D(0);
  const yieldMult = Decimal.pow(1.3, s.upgrades['crawler-yield'] ?? 0);
  const cd = s.upgrades['crawler-depth'] ?? 0; // Deep Crawlers steepen + raise the cap
  const depthFactor = Math.min(1 + s.stats.maxDepth * (0.04 + 0.01 * cd), 10 + cd);
  const swarm = 1 + 0.5 * (s.upgrades['swarm'] ?? 0); // Swarm Protocol
  return D(CRAWLER_BASE).mul(count).mul(swarm).mul(yieldMult).mul(depthFactor).mul(derive(s).collectMult);
}
