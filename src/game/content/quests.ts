// "System Tasks" — a rotating board of objectives that drip rewards. Kept to integer/
// boolean conditions so progress is exact at any scale; resource rewards scale by tier.
import { resourceValue } from '../generation/scaling';
import { RESOURCE_INFO, type ResourceKind } from './resources';
import type { GameState } from '../state/types';

export type QuestKind = 'depth' | 'collect' | 'keys' | 'combo' | 'visitType';

export type QuestReward =
  | { type: 'resource'; kind: ResourceKind; tier: number }
  | { type: 'keys'; amount: number }
  | { type: 'cache'; amount: number };

export interface Quest {
  id: string;
  kind: QuestKind;
  label: string;
  target: number;
  baseline: number;
  arg?: string;
  reward: QuestReward;
  done: boolean;
}

let counter = 0;
const ri = (n: number) => Math.floor(Math.random() * n);
const pick = <T>(a: T[]): T => a[ri(a.length)];

function rollReward(md: number): QuestReward {
  const r = Math.random();
  if (r < 0.15) return { type: 'keys', amount: 1 };
  if (r < 0.27 && md >= 10) return { type: 'cache', amount: 1 };
  return { type: 'resource', kind: pick<ResourceKind>(['clicks', 'data', 'packets', 'tokens']), tier: md };
}

export function rewardLabel(reward: QuestReward): string {
  if (reward.type === 'keys') return `🔑 ${reward.amount} Key${reward.amount > 1 ? 's' : ''}`;
  if (reward.type === 'cache') return `◈ ${reward.amount} Cache`;
  return `${RESOURCE_INFO[reward.kind].icon} ${RESOURCE_INFO[reward.kind].name}`;
}

export function rollQuest(s: GameState): Quest {
  const md = Math.max(s.stats.maxDepth, 1);
  const kind = pick<QuestKind>(['depth', 'collect', 'keys', 'combo', 'visitType']);
  const id = `q${++counter}-${Date.now().toString(36)}`;
  const reward = rollReward(md);

  switch (kind) {
    case 'depth': {
      const target = md + 3 + ri(5);
      return { id, kind, label: `Reach Tier ${target}`, target, baseline: 0, reward, done: false };
    }
    case 'collect': {
      const target = 20 + ri(30);
      return { id, kind, label: `Collect ${target} items`, target, baseline: s.stats.totalCollects, reward, done: false };
    }
    case 'keys': {
      const target = s.keys + 1 + ri(2);
      return { id, kind, label: `Hold ${target} Access Keys`, target, baseline: 0, reward, done: false };
    }
    case 'combo': {
      const target = 15 + ri(20);
      return { id, kind, label: `Reach a ${target} combo`, target, baseline: 0, reward, done: false };
    }
    case 'visitType': {
      const arg = pick(['settings', 'grid', 'dropdown', 'tabs']);
      return { id, kind, label: `Open a ${arg} menu`, target: 1, baseline: 0, arg, reward, done: false };
    }
  }
}

export function questProgress(s: GameState, q: Quest): number {
  switch (q.kind) {
    case 'depth':
      return Math.min(s.stats.maxDepth, q.target);
    case 'collect':
      return Math.min(s.stats.totalCollects - q.baseline, q.target);
    case 'keys':
      return Math.min(s.keys, q.target);
    case 'combo':
      return q.done ? q.target : Math.min(s.combo.count, q.target);
    case 'visitType':
      return q.done || s.nav[s.nav.length - 1].data.menuType === q.arg ? 1 : 0;
  }
}

export function isDone(s: GameState, q: Quest): boolean {
  return q.done || questProgress(s, q) >= q.target;
}

export function applyReward(s: GameState, reward: QuestReward): Partial<GameState> {
  if (reward.type === 'keys') return { keys: s.keys + reward.amount };
  if (reward.type === 'cache') return { cache: s.cache.add(reward.amount) };
  const amt = resourceValue(reward.tier).mul(25);
  return { resources: { ...s.resources, [reward.kind]: s.resources[reward.kind].add(amt) } };
}
