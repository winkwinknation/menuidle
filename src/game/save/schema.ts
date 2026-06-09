// Save (de)serialization. The infinite tree is reproduced from worldSeed + path,
// so we persist only the current path + per-level collected flags + flat state.
import { D, type Decimal } from '../math/bignum';
import { generateMenu, childContext } from '../generation/menuGenerator';
import type { MenuData } from '../generation/menuGenerator';
import { RESOURCE_KINDS, type ResourceKind } from '../content/resources';
import { initialBehavior } from '../systems/behaviorModel';
import { rollQuest, type Quest } from '../content/quests';
import { SIGNAL_MAX_BASE } from '../generation/scaling';
import type { Service } from '../systems/services';
import type { Intensity } from '../generation/dread';
import type { ThemeId } from '../content/skins';
import type { GameState, NavLevel } from '../state/types';

export const CURRENT_VERSION = 8;

interface SaveStats {
  maxDepth: number;
  runMaxDepth: number;
  totalCollects: number;
  totalClicksEarned: string;
  playtimeMs: number;
  lastSaveTs: number;
  startedTs: number;
}

export interface SaveData {
  version: number;
  worldSeed: number;
  currentPath: number[];
  collected: boolean[][];
  cooldowns?: number[][];
  resources?: Record<string, string>;
  carried?: Record<string, string>;
  discovered?: Record<string, boolean>;
  keys?: number;
  services?: Service[];
  signal?: number;
  dread?: number;
  replacement?: number;
  loreProgress?: number;
  ending?: string | null;
  clearedEncounters?: string[];
  wardUntil?: number;
  surgeUntil?: number;
  clicks?: string; // legacy (v1)
  upgrades: Record<string, number>;
  cache?: string;
  prestigeUpgrades?: Record<string, number>;
  codex?: { types: string[]; themes: string[] };
  achievements?: string[];
  quests?: Quest[];
  returnCharges: number;
  stats: SaveStats;
  settings: {
    masterVolume: number;
    horrorIntensity?: Intensity;
    contentAck?: boolean;
    personalDread?: boolean;
    theme?: ThemeId;
    tutorialSeen?: boolean;
  };
}

/** Rebuild the nav stack from a path by generating each prefix menu deterministically. */
export function buildNav(
  worldSeed: number,
  currentPath: number[],
  collected: boolean[][],
  cooldowns?: number[][],
): NavLevel[] {
  const nav: NavLevel[] = [];
  let prev: MenuData | null = null;
  for (let i = 0; i <= currentPath.length; i++) {
    const path = currentPath.slice(0, i);
    const ctx = prev ? childContext(prev, currentPath[i - 1]) : undefined;
    const data = generateMenu(worldSeed, path, ctx);
    const saved = collected?.[i] ?? [];
    const savedCd = cooldowns?.[i] ?? [];
    nav.push({
      data,
      collected: data.items.map((_, idx) => !!saved[idx]),
      cooldowns: data.items.map((_, idx) => savedCd[idx] ?? 0),
    });
    prev = data;
  }
  return nav;
}

export function serialize(s: GameState): SaveData {
  const current = s.nav[s.nav.length - 1];
  return {
    version: CURRENT_VERSION,
    worldSeed: s.worldSeed,
    currentPath: current.data.path,
    collected: s.nav.map((l) => l.collected),
    cooldowns: s.nav.map((l) => l.cooldowns),
    resources: Object.fromEntries(RESOURCE_KINDS.map((k) => [k, s.resources[k].toString()])),
    carried: Object.fromEntries(RESOURCE_KINDS.map((k) => [k, s.carried[k].toString()])),
    discovered: { ...s.discovered },
    keys: s.keys,
    services: s.services,
    signal: s.signal,
    dread: s.dread,
    replacement: s.replacement,
    loreProgress: s.loreProgress,
    ending: s.ending,
    clearedEncounters: s.clearedEncounters,
    wardUntil: s.wardUntil,
    surgeUntil: s.surgeUntil,
    upgrades: s.upgrades,
    cache: s.cache.toString(),
    prestigeUpgrades: s.prestigeUpgrades,
    codex: s.codex,
    achievements: s.achievements,
    quests: s.quests,
    returnCharges: s.returnCharges,
    stats: {
      maxDepth: s.stats.maxDepth,
      runMaxDepth: s.stats.runMaxDepth,
      totalCollects: s.stats.totalCollects,
      totalClicksEarned: s.stats.totalClicksEarned.toString(),
      playtimeMs: s.stats.playtimeMs,
      lastSaveTs: Date.now(),
      startedTs: s.stats.startedTs,
    },
    settings: s.settings,
  };
}

function migrate(data: SaveData): SaveData {
  // Single version for now; future versions transform here.
  return data;
}

export function deserialize(raw: SaveData): GameState {
  const d = migrate(raw);
  const nav = buildNav(d.worldSeed, d.currentPath ?? [], d.collected ?? [], d.cooldowns);

  const resources = {} as Record<ResourceKind, Decimal>;
  for (const k of RESOURCE_KINDS) {
    const legacy = k === 'clicks' ? d.clicks : undefined;
    resources[k] = D(d.resources?.[k] ?? legacy ?? '0');
  }
  const carried = {} as Record<ResourceKind, Decimal>;
  for (const k of RESOURCE_KINDS) carried[k] = D(d.carried?.[k] ?? '0');
  const discovered = {} as Record<ResourceKind, boolean>;
  for (const k of RESOURCE_KINDS) discovered[k] = d.discovered?.[k] ?? resources[k].gt(0);

  const state: GameState = {
    worldSeed: d.worldSeed,
    nav,
    resources,
    carried,
    discovered,
    keys: d.keys ?? 0,
    services: d.services ?? [],
    signal: d.signal ?? SIGNAL_MAX_BASE,
    dread: d.dread ?? 0,
    replacement: d.replacement ?? 0,
    loreProgress: d.loreProgress ?? 0,
    ending: d.ending ?? null,
    endingPrompt: false,
    clearedEncounters: d.clearedEncounters ?? [],
    wardUntil: d.wardUntil ?? 0,
    surgeUntil: d.surgeUntil ?? 0,
    upgrades: d.upgrades ?? {},
    cache: D(d.cache ?? '0'),
    prestigeUpgrades: d.prestigeUpgrades ?? {},
    codex: d.codex ?? { types: ['list'], themes: [] },
    achievements: d.achievements ?? [],
    achievementToasts: [],
    behavior: initialBehavior,
    quests: d.quests ?? [],
    returnCharges: d.returnCharges ?? 1,
    combo: { count: 0, lastTs: 0 },
    regenProgress: 1,
    _regenAccum: 0,
    _playAccum: 0,
    _prodAccum: 0,
    offlineGain: null,
    bankFlash: null,
    stats: {
      maxDepth: d.stats?.maxDepth ?? 0,
      runMaxDepth: d.stats?.runMaxDepth ?? 0,
      totalCollects: d.stats?.totalCollects ?? 0,
      totalClicksEarned: D(d.stats?.totalClicksEarned ?? '0'),
      playtimeMs: d.stats?.playtimeMs ?? 0,
      lastSaveTs: d.stats?.lastSaveTs ?? Date.now(),
      startedTs: d.stats?.startedTs ?? Date.now(),
    },
    settings: {
      masterVolume: d.settings?.masterVolume ?? 0.7,
      horrorIntensity: d.settings?.horrorIntensity ?? 'full',
      contentAck: d.settings?.contentAck ?? false,
      personalDread: d.settings?.personalDread ?? false,
      theme: d.settings?.theme ?? 'corporate',
      tutorialSeen: d.settings?.tutorialSeen ?? false,
    },
    panelRevealed: (d.stats?.totalCollects ?? 0) >= 3,
  };
  if (!state.quests.length) state.quests = [rollQuest(state), rollQuest(state), rollQuest(state)];
  return state;
}
