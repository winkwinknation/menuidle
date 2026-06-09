import { describe, it, expect } from 'vitest';
import { cacheFor, MIN_REBOOT_DEPTH } from './prestige';

describe('prestige cache reward', () => {
  it('gives nothing below the minimum reboot depth', () => {
    expect(cacheFor(0).toNumber()).toBe(0);
    expect(cacheFor(MIN_REBOOT_DEPTH - 1).toNumber()).toBe(0);
  });

  it('gives at least 1 at the threshold and grows with depth', () => {
    expect(cacheFor(MIN_REBOOT_DEPTH).toNumber()).toBeGreaterThanOrEqual(1);
    expect(cacheFor(50).toNumber()).toBeGreaterThan(cacheFor(20).toNumber());
    expect(cacheFor(200).toNumber()).toBeGreaterThan(cacheFor(100).toNumber());
  });
});
