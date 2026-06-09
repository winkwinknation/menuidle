import { describe, it, expect } from 'vitest';
import { useGameStore, makeInitialState } from './store';
import { RESOURCE_KINDS } from '../content/resources';

const st = () => useGameStore.getState();
const reset = (seed: number) => useGameStore.setState(makeInitialState(seed));
const firstSubmenu = (items: { kind: string; locked?: boolean; childEncounter?: boolean }[]) =>
  items.findIndex((i) => i.kind === 'submenu' && !i.locked && !i.childEncounter);
const firstResource = (items: { kind: string; isKey?: boolean }[]) =>
  items.findIndex((i) => i.kind === 'resource' && !i.isKey);

describe('carry & bank', () => {
  it('banks at the surface but carries below it', () => {
    reset(123);
    const rIdx = firstResource(st().nav[0].data.items);
    st().collect(rIdx);
    expect(st().resources.clicks.gt(0)).toBe(true); // root is a List menu → Clicks, banked at surface
    expect(RESOURCE_KINDS.every((k) => st().carried[k].eq(0))).toBe(true);

    st().enter(firstSubmenu(st().nav[0].data.items));
    expect(st().nav.length - 1).toBe(1);
    st().collect(firstResource(st().nav[1].data.items));
    expect(RESOURCE_KINDS.some((k) => st().carried[k].gt(0))).toBe(true);
  });

  it('climbing to the surface banks the whole haul', () => {
    reset(123);
    st().enter(firstSubmenu(st().nav[0].data.items));
    st().collect(firstResource(st().nav[1].data.items));
    expect(RESOURCE_KINDS.some((k) => st().carried[k].gt(0))).toBe(true);

    st().back(); // depth 1 → 0
    expect(st().nav.length - 1).toBe(0);
    expect(RESOURCE_KINDS.every((k) => st().carried[k].eq(0))).toBe(true);
    expect(RESOURCE_KINDS.some((k) => st().resources[k].gt(0))).toBe(true);
  });

  it('a partial climb banks a proportional share', () => {
    reset(123);
    st().enter(firstSubmenu(st().nav[0].data.items));
    st().enter(firstSubmenu(st().nav[1].data.items));
    expect(st().nav.length - 1).toBe(2);
    st().collect(firstResource(st().nav[2].data.items));

    const kind = RESOURCE_KINDS.find((k) => st().carried[k].gt(0))!;
    const before = st().carried[kind];
    st().back(); // climb 1 of 2 → bank half
    expect(st().nav.length - 1).toBe(1);
    const after = st().carried[kind];
    expect(after.gt(0)).toBe(true);
    expect(after.lt(before)).toBe(true);
    expect(st().resources[kind].gt(0)).toBe(true);
  });
});
