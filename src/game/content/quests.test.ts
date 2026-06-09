import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../state/store';
import { rollQuest, questProgress, applyReward } from './quests';

describe('quests', () => {
  it('rolls a valid quest with a positive target', () => {
    const s = makeInitialState(1);
    const q = rollQuest(s);
    expect(q.target).toBeGreaterThan(0);
    expect(q.id).toBeTruthy();
    expect(q.done).toBe(false);
  });

  it('depth quest progresses with maxDepth', () => {
    const s = makeInitialState(1);
    const q = { id: 'x', kind: 'depth' as const, label: '', target: 10, baseline: 0, reward: { type: 'keys' as const, amount: 1 }, done: false };
    s.stats.maxDepth = 4;
    expect(questProgress(s, q)).toBe(4);
    s.stats.maxDepth = 20;
    expect(questProgress(s, q)).toBe(10); // capped at target
  });

  it('key reward grants keys', () => {
    const s = makeInitialState(1);
    const patch = applyReward(s, { type: 'keys', amount: 2 });
    expect(patch.keys).toBe(s.keys + 2);
  });
});
