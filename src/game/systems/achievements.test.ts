import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../state/store';
import { newlyUnlocked } from './achievements';
import { D } from '../math/bignum';

const ids = (s: ReturnType<typeof makeInitialState>, owned = new Set<string>()) =>
  newlyUnlocked(s, owned).map((a) => a.id);

describe('achievements', () => {
  it('unlocks first-descent at depth 1', () => {
    const s = makeInitialState(1);
    s.stats.maxDepth = 1;
    expect(ids(s)).toContain('first-descent');
  });

  it('does not re-unlock owned achievements', () => {
    const s = makeInitialState(1);
    s.stats.maxDepth = 1;
    expect(ids(s, new Set(['first-descent']))).not.toContain('first-descent');
  });

  it('millionaire needs 1,000,000 Clicks', () => {
    const s = makeInitialState(1);
    expect(ids(s)).not.toContain('millionaire');
    s.resources.clicks = D(1_000_000);
    expect(ids(s)).toContain('millionaire');
  });
});
