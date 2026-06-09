import { describe, it, expect } from 'vitest';
import { corruptLabel, effectiveBand, dreadBand } from './dread';

describe('dread escalation', () => {
  it('is a slow burn — clean for the first tiers', () => {
    expect(dreadBand(0)).toBe(0);
    expect(dreadBand(11)).toBe(0);
    expect(dreadBand(12)).toBe(1);
    expect(dreadBand(300)).toBe(6);
  });

  it('Off disables it; Mild caps at band 3', () => {
    expect(effectiveBand(500, 'off')).toBe(0);
    expect(effectiveBand(500, 'mild')).toBe(3);
    expect(effectiveBand(500, 'full')).toBe(6);
  });

  it('never corrupts when Off or in the clean band', () => {
    expect(corruptLabel('Audio Settings', 500, 'off')).toBe('Audio Settings');
    expect(corruptLabel('Audio Settings', 5, 'full')).toBe('Audio Settings');
  });

  it('is deterministic for the same label + depth', () => {
    const a = corruptLabel('Network Configuration', 120, 'full');
    const b = corruptLabel('Network Configuration', 120, 'full');
    expect(a).toBe(b);
  });

  it('actually corrupts something deep down', () => {
    const labels = ['Audio Settings', 'Display Output', 'Privacy', 'System', 'Network', 'Storage'];
    const changed = labels.some((l) => corruptLabel(l, 250, 'full') !== l);
    expect(changed).toBe(true);
  });
});
