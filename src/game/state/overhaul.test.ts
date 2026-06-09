import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, makeInitialState } from './store';
import { D, type Decimal } from '../math/bignum';
import { generateMenu, type MenuData } from '../generation/menuGenerator';
import { RESOURCE_KINDS, type ResourceKind } from '../content/resources';
import type { NavLevel } from './types';

const fullRes = (vals: Partial<Record<ResourceKind, number>> = {}, fill = 0): Record<ResourceKind, Decimal> =>
  Object.fromEntries(RESOURCE_KINDS.map((k) => [k, D(vals[k] ?? fill)])) as Record<ResourceKind, Decimal>;
import { serviceBaseRate, servicesByKind } from '../systems/services';
import { signalDrainPerSec, boosterRefill } from '../systems/signal';
import { derive, effectiveCost, UPGRADES_BY_ID } from '../content/upgrades';
import { LORE, nextLoreIndex } from '../content/lore';

const st = () => useGameStore.getState();
const reset = (seed: number) => useGameStore.setState(makeInitialState(seed));
const level = (data: MenuData): NavLevel => ({
  data,
  collected: data.items.map(() => false),
  cooldowns: data.items.map(() => 0),
});

/** Find a (seed,menu) whose generated menu of the given type has >= n resource items matching pred. */
function findMenu(type: 'settings' | 'list', pred: (i: MenuData['items'][number]) => boolean, n = 1): MenuData {
  for (let seed = 0; seed < 200; seed++) {
    const m = generateMenu(seed, [1], { theme: 'system', menuType: type });
    if (m.items.filter((i) => i.kind === 'resource' && pred(i)).length >= n) return m;
  }
  throw new Error(`no ${type} menu with ${n} matching items`);
}

beforeEach(() => reset(7));

describe('Background Services', () => {
  it('enabling an installable Settings toggle creates a Data service that accrues over time', () => {
    const settings = findMenu('settings', (i) => !!i.installable);
    const idx = settings.items.findIndex((i) => i.kind === 'resource' && i.installable);
    useGameStore.setState({ nav: [st().nav[0], level(settings)] });

    st().enableService(idx);
    expect(st().services.length).toBe(1);
    expect(st().services[0].kind).toBe('data'); // settings menus yield Data

    const before = st().resources.data;
    st().tick(1000);
    expect(st().resources.data.gt(before)).toBe(true);

    st().disableService(st().services[0].id);
    expect(st().services.length).toBe(0);
  });

  it('respects the service slot cap', () => {
    const settings = findMenu('settings', (i) => !!i.installable, 4);
    useGameStore.setState({ nav: [st().nav[0], level(settings)] });
    const slots = st().services; // start empty
    expect(slots.length).toBe(0);

    settings.items.forEach((i) => {
      if (i.kind === 'resource' && i.installable) st().enableService(i.index);
    });
    const installable = settings.items.filter((i) => i.kind === 'resource' && i.installable).length;
    expect(st().services.length).toBe(Math.min(installable, 3)); // base slots = 3
  });

  it('service base rate grows with the tier it was enabled at', () => {
    expect(serviceBaseRate(5).gt(serviceBaseRate(1))).toBe(true);
  });

  it('servicesByKind sums per resource', () => {
    const s = st();
    s.services.push(
      { id: 'a', path: [1], index: 0, kind: 'data', tier: 2, theme: 'system', label: 'A' },
      { id: 'b', path: [1], index: 1, kind: 'data', tier: 2, theme: 'system', label: 'B' },
    );
    const by = servicesByKind(s);
    expect(by.data.gt(0)).toBe(true);
    expect(by.clicks.eq(0)).toBe(true);
  });
});

describe('Signal tether', () => {
  it('drains below the surface and tops up at the surface', () => {
    expect(signalDrainPerSec(0)).toBe(0);
    expect(signalDrainPerSec(5)).toBeGreaterThan(signalDrainPerSec(1));

    // Below the surface: drains.
    useGameStore.setState({ nav: [st().nav[0], level(generateMenu(7, [1], { theme: 'system', menuType: 'list' }))] });
    const max = st().signal;
    st().tick(1000);
    expect(st().signal).toBeLessThan(max);

    // Back at the surface: refills to max.
    useGameStore.setState({ nav: [st().nav[0]], signal: 5 });
    st().tick(16);
    expect(st().signal).toBe(max);
  });

  it('Lost Signal bleeds the carried haul', () => {
    useGameStore.setState({
      nav: [st().nav[0], level(generateMenu(7, [1], { theme: 'system', menuType: 'list' }))],
      signal: 0,
      carried: fullRes({ clicks: 100 }),
    });
    st().tick(1000);
    expect(st().carried.clicks.lt(100)).toBe(true);
    expect(st().carried.clicks.gt(0)).toBe(true);
  });

  it('booster refill scales with depth', () => {
    expect(boosterRefill(10)).toBeGreaterThan(boosterRefill(0));
  });
});

describe('Renewable nodes', () => {
  it('collecting a renewable node sets a cooldown, then tick re-arms it', () => {
    const list = findMenu('list', (i) => !!i.renewable);
    const idx = list.items.findIndex((i) => i.kind === 'resource' && i.renewable);
    useGameStore.setState({ nav: [st().nav[0], level(list)] });

    st().collect(idx);
    let cur = st().nav[st().nav.length - 1];
    expect(cur.collected[idx]).toBe(true);
    expect(cur.cooldowns[idx]).toBeGreaterThan(Date.now());

    // Force the cooldown into the past, then tick re-arms (un-greys) the node.
    const cds = cur.cooldowns.slice();
    cds[idx] = Date.now() - 1;
    useGameStore.setState({ nav: [st().nav[0], { ...cur, cooldowns: cds }] });
    st().tick(16);
    cur = st().nav[st().nav.length - 1];
    expect(cur.collected[idx]).toBe(false);
    expect(cur.cooldowns[idx]).toBe(0);
  });
});

describe('generation flags are deterministic', () => {
  it('renewable / installable / signalBoost / landmark are stable for a fixed seed+path', () => {
    const flags = (m: MenuData) =>
      m.items.map((i) => `${i.renewable ? 'R' : ''}${i.installable ? 'I' : ''}${i.signalBoost ? 'S' : ''}`);
    const a = generateMenu(123, [2, 3, 4, 5]);
    const b = generateMenu(123, [2, 3, 4, 5]);
    expect(flags(a)).toEqual(flags(b));
    expect(a.landmark).toBe(b.landmark);
  });

  it('landmarks appear deterministically as you descend', () => {
    let saw = false;
    for (let seed = 0; seed < 12 && !saw; seed++) {
      for (let d = 4; d <= 16 && !saw; d++) {
        const path = Array.from({ length: d }, () => 1);
        if (generateMenu(seed, path).landmark) saw = true;
      }
    }
    expect(saw).toBe(true);
  });
});

describe('skill tree gating + derived effects', () => {
  const rich = () => useGameStore.setState({ resources: fullRes({}, 1e9) });

  it('a node cannot be bought until its prerequisites are owned', () => {
    rich();
    st().buyUpgrade('deep-yield'); // requires click-power
    expect(st().upgrades['deep-yield'] ?? 0).toBe(0);
    st().buyUpgrade('click-power');
    st().buyUpgrade('deep-yield');
    expect(st().upgrades['deep-yield'] ?? 0).toBe(1);
  });

  it('the efficiency node lowers effective cost', () => {
    const dfn = UPGRADES_BY_ID['return-charge'];
    const base = effectiveCost(st(), dfn);
    useGameStore.setState({ upgrades: { efficiency: 5 } });
    expect(effectiveCost(st(), dfn).lt(base)).toBe(true);
  });

  it('derive reflects upgrade + prestige levels', () => {
    expect(derive(st()).serviceSlots).toBe(3);
    expect(derive(st()).signalMax).toBe(100);
    useGameStore.setState({
      upgrades: { 'service-slots': 2, 'signal-cap': 3, 'bank-bonus': 1, 'deep-yield': 5 },
      prestigeUpgrades: { 'p-slots': 1, 'p-signal': 1 },
    });
    const eff = derive(st());
    expect(eff.serviceSlots).toBe(6); // 3 base + 2 upgrade + 1 prestige
    expect(eff.signalMax).toBe(100 + (3 + 1) * 25);
    expect(eff.bankBonus).toBeCloseTo(0.08);
    expect(eff.deepYieldPer).toBeCloseTo(0.2);
  });
});

describe('horror: dread, lore, rituals, endings', () => {
  it('Dread builds in the deep and Resonance turns it into power', () => {
    useGameStore.setState({ upgrades: { attune: 5 }, dread: 0 });
    expect(derive(st()).resonanceMult).toBe(1); // no dread → no bonus
    useGameStore.setState({ dread: 100 });
    expect(derive(st()).resonanceMult).toBeGreaterThan(1); // dread powers it
  });

  it('nextLoreIndex gates by band and advances in order', () => {
    expect(nextLoreIndex(0, 0)).toBe(0);
    expect(nextLoreIndex(LORE.length, 6)).toBe(null);
    const firstHigh = LORE.findIndex((f) => f.band > 0);
    expect(nextLoreIndex(firstHigh, 0)).toBe(null); // band too low
    expect(nextLoreIndex(firstHigh, 6)).toBe(firstHigh);
  });

  it('an effigy ritual grants a permanent multiplier and advances the copy', () => {
    useGameStore.setState({ resources: fullRes({}, 1e9) });
    const before = derive(st()).collectMult;
    st().performRitual('effigy');
    expect(st().prestigeUpgrades['effigy']).toBe(1);
    expect(st().replacement).toBeGreaterThan(0);
    expect(derive(st()).collectMult.gt(before)).toBe(true);
  });

  it('Severance only opens the ending once the copy is complete enough', () => {
    useGameStore.setState({ resources: fullRes({}, 1e9), replacement: 50 });
    st().performRitual('severance');
    expect(st().endingPrompt).toBe(false);
    useGameStore.setState({ replacement: 90 });
    st().performRitual('severance');
    expect(st().endingPrompt).toBe(true);
    st().chooseEnding('hollow');
    expect(st().ending).toBe('hollow');
  });

  it('collecting The Bottom item opens the ending', () => {
    const bottom: MenuData = {
      path: [1],
      depth: 240,
      seed: 1,
      theme: 'system',
      menuType: 'list',
      landmark: 'bottom',
      items: [{ index: 0, kind: 'resource', label: 'the original', value: D(1), harvestKind: 'marrow', final: true }],
    };
    useGameStore.setState({ nav: [st().nav[0], level(bottom)] });
    st().collect(0);
    expect(st().endingPrompt).toBe(true);
  });

  it('climbing to the surface banks the haul and flashes it', () => {
    useGameStore.setState({
      nav: [st().nav[0], level(generateMenu(7, [1], { theme: 'system', menuType: 'list' }))],
      carried: fullRes({ clicks: 50 }),
    });
    st().back();
    expect(st().bankFlash).not.toBeNull();
    expect(st().carried.clicks.eq(0)).toBe(true);
    expect(st().resources.clicks.gte(50)).toBe(true);
  });
});
