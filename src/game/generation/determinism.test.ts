import { describe, it, expect } from 'vitest';
import { generateMenu, type MenuData } from './menuGenerator';

// Compare the economic "bones" of a menu (kind/label/value) as plain data.
function snap(m: MenuData) {
  return m.items.map((it) => ({
    k: it.kind,
    l: it.label,
    v: it.value ? it.value.toString() : null,
  }));
}

describe('menu generation determinism', () => {
  it('same world seed + path yields byte-identical menus', () => {
    const a = generateMenu(12345, [1, 2, 3]);
    const b = generateMenu(12345, [1, 2, 3]);
    expect(snap(a)).toEqual(snap(b));
    expect(a.seed).toBe(b.seed);
  });

  it('different world seeds produce different menus', () => {
    expect(snap(generateMenu(1, []))).not.toEqual(snap(generateMenu(2, [])));
  });

  it('different paths produce different menus', () => {
    expect(snap(generateMenu(99, [0]))).not.toEqual(snap(generateMenu(99, [1])));
  });

  it('every menu is navigable (>=1 submenu) and rewarding (>=1 resource)', () => {
    const paths: number[][] = [[], [0], [3, 1], [2, 2, 2, 2, 2]];
    for (let seed = 0; seed < 8; seed++) {
      for (const path of paths) {
        const m = generateMenu(seed, path);
        expect(m.items.some((i) => i.kind === 'submenu')).toBe(true);
        expect(m.items.some((i) => i.kind === 'resource')).toBe(true);
      }
    }
  });

  it('resource value grows with depth', () => {
    const maxVal = (m: MenuData) =>
      Math.max(...m.items.filter((i) => i.value).map((i) => i.value!.toNumber()));
    const shallow = maxVal(generateMenu(7, []));
    const deep = maxVal(generateMenu(7, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(deep).toBeGreaterThan(shallow);
  });
});
