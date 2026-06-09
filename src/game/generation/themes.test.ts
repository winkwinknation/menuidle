import { describe, it, expect } from 'vitest';
import { generateMenu } from './menuGenerator';
import { THEMES, TOP_CATEGORIES } from './themes';

describe('themed + typed generation', () => {
  it('the Main Menu is a hub of every category', () => {
    const m = generateMenu(42, []);
    expect(m.theme).toBe('root');
    const subs = m.items.filter((i) => i.kind === 'submenu');
    expect(subs.length).toBe(TOP_CATEGORIES.length);
    for (const s of subs) expect(TOP_CATEGORIES).toContain(s.childTheme);
  });

  it('a themed list menu only holds on-theme resources and related branches', () => {
    const theme = 'sound';
    const actions = new Set(THEMES[theme].actions);
    const related = new Set([theme, ...THEMES[theme].children]);
    for (let seed = 0; seed < 25; seed++) {
      const m = generateMenu(seed, [3], { theme, menuType: 'list' });
      for (const it of m.items) {
        if (it.kind === 'resource') expect(actions.has(it.label)).toBe(true);
        if (it.kind === 'submenu') expect(related.has(it.childTheme!)).toBe(true);
      }
    }
  });

  it('settings menus draw resources from the toggle pool', () => {
    const theme = 'network';
    const toggles = new Set(THEMES[theme].toggles);
    for (let seed = 0; seed < 25; seed++) {
      const m = generateMenu(seed, [2], { theme, menuType: 'settings' });
      for (const it of m.items) {
        if (it.kind === 'resource') expect(toggles.has(it.label)).toBe(true);
      }
    }
  });

  it('resources never exceed the per-menu cap', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const path of [[1], [2, 3], [4, 4, 4, 4]]) {
        const m = generateMenu(seed, path);
        expect(m.items.filter((i) => i.kind === 'resource').length).toBeLessThanOrEqual(5);
      }
    }
  });

  it('encounter menus are all-resource gauntlets with a spec', () => {
    const m = generateMenu(3, [5], { theme: 'system', menuType: 'list', encounter: true });
    expect(m.encounter).toBeTruthy();
    expect(m.items.length).toBeGreaterThan(0);
    expect(m.items.every((i) => i.kind === 'resource')).toBe(true);
    expect(m.encounter!.target).toBe(m.items.length);
  });

  it('gateways exist: some submenus open a different menu type', () => {
    let sawGateway = false;
    for (let seed = 0; seed < 60 && !sawGateway; seed++) {
      const m = generateMenu(seed, [1], { theme: 'system', menuType: 'list' });
      if (m.items.some((i) => i.kind === 'submenu' && i.childType !== 'list')) sawGateway = true;
    }
    expect(sawGateway).toBe(true);
  });
});
