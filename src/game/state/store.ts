import { create } from 'zustand';
import { Decimal, D } from '../math/bignum';
import { generateMenu, childContext } from '../generation/menuGenerator';
import { comboMult, SIGNAL_MAX_BASE } from '../generation/scaling';
import { derive, effectiveCost, UPGRADES_BY_ID, CHARGE_CAP_UPGRADES } from '../content/upgrades';
import { resourceForMenuType, RESOURCE_KINDS, type ResourceKind } from '../content/resources';
import { RECIPE_BY_ID, WARD_MS, SURGE_MS, recipeCost } from '../content/crafting';
import { crawlerRate } from '../systems/automation';
import { serviceId, serviceSlots, isServiceOn, servicesByKind, type Service } from '../systems/services';
import { signalDrainPerSec, LOST_SIGNAL_BLEED_PER_SEC, boosterRefill } from '../systems/signal';
import { cacheFor, PRESTIGE_BY_ID } from '../content/prestige';
import { dreadBand } from '../generation/dread';
import { nextLoreIndex } from '../content/lore';
import { RITUAL_BY_ID, ritualCost, canPerform, RITUAL_WARD_MS, RITUAL_SURGE_MS } from '../content/rituals';
import { newlyUnlocked } from '../systems/achievements';
import { steamUnlock } from '../systems/steam';
import { recordAction, initialBehavior } from '../systems/behaviorModel';
import { rollQuest, isDone as questIsDone, applyReward as applyQuestReward, type QuestReward } from '../content/quests';
import { serialize, deserialize, type SaveData } from '../save/schema';
import { persist, loadRaw, clearRaw } from '../save/saveManager';
import type { GameState } from './types';

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const randomSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

const zeroResources = (): Record<ResourceKind, Decimal> =>
  Object.fromEntries(RESOURCE_KINDS.map((k) => [k, D(0)])) as Record<ResourceKind, Decimal>;
const noDiscovered = (): Record<ResourceKind, boolean> =>
  Object.fromEntries(RESOURCE_KINDS.map((k) => [k, false])) as Record<ResourceKind, boolean>;

type ResourceMap = Record<ResourceKind, Decimal>;

/** Climbing banks a proportional share of the carried haul; reaching the surface banks it all. */
function bankOnAscend(s: GameState, climb: number): { resources: ResourceMap; carried: ResourceMap } {
  const depth = s.nav.length - 1;
  const newDepth = depth - climb;
  const fraction = newDepth <= 0 ? 1 : climb / depth;
  const bankBonus = derive(s).bankBonus; // upgrades reward banking with bonus resources
  const resources = { ...s.resources };
  const carried = { ...s.carried };
  for (const k of RESOURCE_KINDS) {
    const move = carried[k].mul(fraction);
    resources[k] = resources[k].add(move.mul(1 + bankBonus));
    carried[k] = newDepth <= 0 ? D(0) : carried[k].sub(move);
  }
  return { resources, carried };
}

type Codex = GameState['codex'];
function addCodex(codex: Codex, type: string, theme: string): Codex {
  const types = codex.types.includes(type) ? codex.types : [...codex.types, type];
  const themes = theme === 'root' || codex.themes.includes(theme) ? codex.themes : [...codex.themes, theme];
  if (types === codex.types && themes === codex.themes) return codex;
  return { types, themes };
}

function b64encode(s: string): string {
  return btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(''));
}
function b64decode(s: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
}

export function makeInitialState(worldSeed = randomSeed()): GameState {
  const root = generateMenu(worldSeed, []);
  const state: GameState = {
    worldSeed,
    nav: [{ data: root, collected: root.items.map(() => false), cooldowns: root.items.map(() => 0) }],
    resources: zeroResources(),
    carried: zeroResources(),
    discovered: noDiscovered(),
    keys: 0,
    services: [],
    signal: SIGNAL_MAX_BASE,
    dread: 0,
    replacement: 0,
    loreProgress: 0,
    ending: null,
    endingPrompt: false,
    clearedEncounters: [],
    wardUntil: 0,
    surgeUntil: 0,
    upgrades: {},
    cache: D(0),
    prestigeUpgrades: {},
    returnCharges: 1,
    combo: { count: 0, lastTs: 0 },
    regenProgress: 1,
    _regenAccum: 0,
    _playAccum: 0,
    _prodAccum: 0,
    offlineGain: null,
    bankFlash: null,
    codex: { types: ['list'], themes: [] },
    achievements: [],
    achievementToasts: [],
    behavior: initialBehavior,
    quests: [],
    stats: {
      maxDepth: 0,
      runMaxDepth: 0,
      totalCollects: 0,
      totalClicksEarned: D(0),
      playtimeMs: 0,
      lastSaveTs: Date.now(),
      startedTs: Date.now(),
    },
    settings: {
      masterVolume: 0.7,
      horrorIntensity: 'full',
      contentAck: false,
      personalDread: false,
      theme: 'corporate',
      tutorialSeen: false,
    },
    panelRevealed: false,
  };
  state.quests = [rollQuest(state), rollQuest(state), rollQuest(state)];
  return state;
}

interface Actions {
  enter: (index: number) => void;
  back: () => void;
  collect: (index: number) => Decimal | null;
  enableService: (index: number) => void;
  disableService: (id: string) => void;
  buyUpgrade: (id: string) => void;
  reboot: () => void;
  buyPrestige: (id: string) => void;
  craft: (id: string) => void;
  performRitual: (id: string) => void;
  chooseEnding: (id: string) => void;
  newGamePlus: () => void;
  claimQuest: (id: string) => void;
  resolveEncounter: (reward: QuestReward) => void;
  escapeEncounter: () => void;
  dismissOffline: () => void;
  dismissBankFlash: () => void;
  dismissToast: (id: string) => void;
  tick: (dt: number) => void;
  saveNow: () => Promise<void>;
  loadGame: () => Promise<boolean>;
  resetSave: () => Promise<void>;
  exportSave: () => string;
  importSave: (code: string) => boolean;
}

export type Store = GameState & Actions;

export const useGameStore = create<Store>()((set, get) => ({
  ...makeInitialState(),

  enter: (index) => {
    const s = get();
    const level = s.nav[s.nav.length - 1];
    const item = level?.data.items[index];
    if (!item || item.kind !== 'submenu') return;

    // Locked menus need an Access Key; once paid, the parent remembers (collected flag).
    const alreadyOpen = level.collected[index];
    const needsKey = Boolean(item.locked) && !alreadyOpen;
    if (needsKey && s.keys <= 0) return;

    const path = [...level.data.path, index];
    let ctx = childContext(level.data, index);
    if (ctx.encounter && s.clearedEncounters.includes(path.join('.'))) ctx = { ...ctx, encounter: false };
    const data = generateMenu(s.worldSeed, path, ctx);
    const childLevel = { data, collected: data.items.map(() => false), cooldowns: data.items.map(() => 0) };

    let baseNav = s.nav;
    if (needsKey) {
      const collected = level.collected.slice();
      collected[index] = true;
      baseNav = s.nav.slice();
      baseNav[baseNav.length - 1] = { ...level, collected };
    }
    const nav = [...baseNav, childLevel];

    // Echo landmarks surrender the next ordered lore fragment (if your band has reached it).
    let loreProgress = s.loreProgress;
    let toasts = s.achievementToasts;
    if (data.landmark === 'echo') {
      const idx = nextLoreIndex(loreProgress, dreadBand(data.depth));
      if (idx !== null) {
        loreProgress = idx + 1;
        toasts = [...toasts, { id: 'lore-' + idx, name: 'Echo recovered' }];
      }
    }

    set({
      nav,
      keys: needsKey ? s.keys - 1 : s.keys,
      codex: addCodex(s.codex, data.menuType, data.theme),
      behavior: recordAction(s.behavior, now()),
      loreProgress,
      achievementToasts: toasts,
      stats: {
        ...s.stats,
        maxDepth: Math.max(s.stats.maxDepth, path.length),
        runMaxDepth: Math.max(s.stats.runMaxDepth, path.length),
      },
    });
  },

  back: () => {
    const s = get();
    const depth = s.nav.length - 1;
    if (depth <= 0 || s.returnCharges <= 0) return;
    const climb = Math.min(derive(s).reach, depth);
    const { resources, carried } = bankOnAscend(s, climb);
    // Capture what actually got banked, for the climb-and-bank juice.
    const amounts: Partial<Record<ResourceKind, Decimal>> = {};
    for (const k of RESOURCE_KINDS) {
      const d = resources[k].sub(s.resources[k]);
      if (d.gt(0)) amounts[k] = d;
    }
    set({
      nav: s.nav.slice(0, s.nav.length - climb),
      returnCharges: s.returnCharges - 1,
      combo: { count: 0, lastTs: 0 },
      resources,
      carried,
      bankFlash: Object.keys(amounts).length ? { amounts, id: Date.now() } : s.bankFlash,
    });
  },

  collect: (index) => {
    const s = get();
    const level = s.nav[s.nav.length - 1];
    if (!level) return null;
    const item = level.data.items[index];
    if (!item || item.kind !== 'resource' || level.collected[index]) return null;

    const t = now();
    const eff = derive(s);
    const collected = level.collected.slice();
    collected[index] = true;
    // Renewable nodes grey out only until their cooldown elapses (tick re-arms them).
    const cooldowns = level.cooldowns.slice();
    if (item.renewable && item.cooldownMs) cooldowns[index] = Date.now() + item.cooldownMs;
    const nav = s.nav.slice();
    nav[nav.length - 1] = { ...level, collected, cooldowns };
    const totalCollects = s.stats.totalCollects + 1;

    // Key item: grants an Access Key — no resource, no combo.
    if (item.isKey) {
      set({
        nav,
        keys: s.keys + 1,
        behavior: recordAction(s.behavior, t),
        stats: { ...s.stats, totalCollects },
        panelRevealed: s.panelRevealed || totalCollects >= 3,
      });
      return D(0);
    }

    // Signal Booster: restores the dive tether instead of yielding a resource.
    if (item.signalBoost) {
      const depth = s.nav.length - 1;
      set({
        nav,
        signal: Math.min(eff.signalMax, s.signal + boosterRefill(depth) * eff.boosterMult),
        behavior: recordAction(s.behavior, t),
        stats: { ...s.stats, totalCollects },
        panelRevealed: s.panelRevealed || totalCollects >= 3,
      });
      return D(0);
    }

    // The Bottom's single item: collecting the original opens the ending.
    if (item.final) {
      set({
        nav,
        endingPrompt: true,
        behavior: recordAction(s.behavior, t),
        stats: { ...s.stats, totalCollects },
      });
      return D(0);
    }

    // Harvested dark resource — scraped from the deep; banked/carried like any resource.
    if (item.harvestKind) {
      const hk = item.harvestKind;
      const hgain = (item.value ?? D(0)).mul(eff.collectMult);
      const atSurfaceH = s.nav.length - 1 === 0;
      set({
        nav,
        resources: atSurfaceH ? { ...s.resources, [hk]: s.resources[hk].add(hgain) } : s.resources,
        carried: atSurfaceH ? s.carried : { ...s.carried, [hk]: s.carried[hk].add(hgain) },
        discovered: s.discovered[hk] ? s.discovered : { ...s.discovered, [hk]: true },
        behavior: recordAction(s.behavior, t),
        stats: { ...s.stats, totalCollects, totalClicksEarned: s.stats.totalClicksEarned },
        panelRevealed: s.panelRevealed || totalCollects >= 3,
      });
      return hgain;
    }

    const kind = resourceForMenuType(level.data.menuType);
    const within = t - s.combo.lastTs < eff.comboWindowMs;
    const count = within ? s.combo.count + 1 : 1;
    const mult = comboMult(count, eff.comboMaxBonus);
    const surge = s.surgeUntil > Date.now() ? 2 : 1;
    const deep = 1 + eff.deepYieldPer * (s.nav.length - 1); // the deep pays better
    const gain = (item.value ?? D(0))
      .mul(eff.collectMult)
      .mul(eff.resonanceMult)
      .mul(mult)
      .mul(surge)
      .mul(deep);

    // Deep collections go into the unbanked haul; at the surface they bank directly.
    const atSurface = s.nav.length - 1 === 0;
    const resources = atSurface ? { ...s.resources, [kind]: s.resources[kind].add(gain) } : s.resources;
    const carried = atSurface ? s.carried : { ...s.carried, [kind]: s.carried[kind].add(gain) };
    const discovered = s.discovered[kind] ? s.discovered : { ...s.discovered, [kind]: true };
    set({
      resources,
      carried,
      discovered,
      combo: { count, lastTs: t },
      nav,
      behavior: recordAction(s.behavior, t),
      stats: { ...s.stats, totalCollects, totalClicksEarned: s.stats.totalClicksEarned.add(gain) },
      panelRevealed: s.panelRevealed || totalCollects >= 3,
    });
    return gain;
  },

  // Enable a Background Service on an installable node (a Settings toggle): a persistent generator
  // that produces its menu's resource forever, until disabled. Bounded by service slots.
  enableService: (index) => {
    const s = get();
    const level = s.nav[s.nav.length - 1];
    const item = level?.data.items[index];
    if (!item || item.kind !== 'resource' || !item.installable) return;
    const path = level.data.path;
    const id = serviceId(path, index);
    if (s.services.some((x) => x.id === id)) return; // already running
    if (s.services.length >= serviceSlots(s)) return; // no free slot
    const kind = resourceForMenuType(level.data.menuType);
    const svc: Service = {
      id,
      path: path.slice(),
      index,
      kind,
      tier: level.data.depth,
      theme: level.data.theme,
      label: item.label,
    };
    const discovered = s.discovered[kind] ? s.discovered : { ...s.discovered, [kind]: true };
    set({ services: [...s.services, svc], discovered, behavior: recordAction(s.behavior, now()) });
  },

  disableService: (id) => {
    const s = get();
    if (!s.services.some((x) => x.id === id)) return;
    set({ services: s.services.filter((x) => x.id !== id) });
  },

  buyUpgrade: (id) => {
    const s = get();
    const dfn = UPGRADES_BY_ID[id];
    if (!dfn) return;
    const level = s.upgrades[id] ?? 0;
    if (dfn.max != null && level >= dfn.max) return;
    if (dfn.requires && !dfn.requires.every((r) => (s.upgrades[r] ?? 0) >= 1)) return;
    if (dfn.unlock && !dfn.unlock(s)) return;
    const cost = effectiveCost(s, dfn);
    const res = dfn.costResource;
    if (s.resources[res].lt(cost)) return;

    const upgrades = { ...s.upgrades, [id]: level + 1 };
    const patch: Partial<GameState> = {
      resources: { ...s.resources, [res]: s.resources[res].sub(cost) },
      upgrades,
    };
    // Buying a charge-cap upgrade refills you to the new maximum — instant payoff.
    if (CHARGE_CAP_UPGRADES.includes(id)) {
      patch.returnCharges = derive({ ...s, upgrades }).maxCharges;
    }
    set(patch);
  },

  reboot: () => {
    const s = get();
    const gain = cacheFor(s.stats.runMaxDepth);
    if (gain.lte(0)) return;
    // Fresh run in the same world; keep prestige currency/upgrades, discoveries and lifetime stats.
    const fresh = makeInitialState(s.worldSeed);
    fresh.cache = s.cache.add(gain);
    fresh.prestigeUpgrades = s.prestigeUpgrades;
    fresh.discovered = { ...s.discovered };
    // The OWNER keeps what it learned: the copy of you persists across reboots, and grows.
    fresh.replacement = Math.min(100, s.replacement + 3);
    fresh.codex = s.codex;
    fresh.achievements = s.achievements;
    fresh.settings = s.settings; // preserve volume/intensity/theme/etc. across reboot
    fresh.behavior = s.behavior;
    fresh.stats = {
      ...fresh.stats,
      maxDepth: s.stats.maxDepth,
      playtimeMs: s.stats.playtimeMs,
      startedTs: s.stats.startedTs,
      totalClicksEarned: s.stats.totalClicksEarned,
      runMaxDepth: 0,
    };
    fresh.returnCharges = derive(fresh).maxCharges;
    set(fresh);
  },

  buyPrestige: (id) => {
    const s = get();
    const dfn = PRESTIGE_BY_ID[id];
    if (!dfn) return;
    const level = s.prestigeUpgrades[id] ?? 0;
    if (dfn.max != null && level >= dfn.max) return;
    const cost = dfn.cost(level);
    if (s.cache.lt(cost)) return;
    const prestigeUpgrades = { ...s.prestigeUpgrades, [id]: level + 1 };
    const patch: Partial<GameState> = { cache: s.cache.sub(cost), prestigeUpgrades };
    if (id === 'p-charges') {
      patch.returnCharges = derive({ ...s, prestigeUpgrades }).maxCharges;
    }
    set(patch);
  },

  craft: (id) => {
    const s = get();
    const r = RECIPE_BY_ID[id];
    if (!r) return;
    const entries = Object.entries(recipeCost(s, r)) as [ResourceKind, Decimal][];
    if (!entries.every(([k, cost]) => s.resources[k].gte(cost))) return;
    const resources = { ...s.resources };
    for (const [k, cost] of entries) resources[k] = resources[k].sub(cost);
    const patch: Partial<GameState> = { resources };
    if (r.effect === 'key') patch.keys = s.keys + 1;
    if (r.effect === 'ward') patch.wardUntil = Date.now() + WARD_MS;
    if (r.effect === 'surge') patch.surgeUntil = Date.now() + SURGE_MS;
    set(patch);
  },

  performRitual: (id) => {
    const s = get();
    const r = RITUAL_BY_ID[id];
    if (!r || !canPerform(s, r)) return;
    const cost = ritualCost(s, r);
    const resources = { ...s.resources };
    for (const [k, c] of Object.entries(cost) as [ResourceKind, Decimal][]) resources[k] = resources[k].sub(c);
    const patch: Partial<GameState> = { resources };
    if (r.effect === 'ward') patch.wardUntil = Date.now() + RITUAL_WARD_MS;
    else if (r.effect === 'surge') patch.surgeUntil = Date.now() + RITUAL_SURGE_MS;
    else if (r.effect === 'effigy') {
      patch.prestigeUpgrades = { ...s.prestigeUpgrades, effigy: (s.prestigeUpgrades['effigy'] ?? 0) + 1 };
      patch.replacement = Math.min(100, s.replacement + 5); // the copy completes a little
    } else if (r.effect === 'severance') {
      patch.endingPrompt = true; // open the ending sequence
    }
    set(patch);
  },

  // Keep endingPrompt open so the chosen ending + the New Game+ offer stay on screen until NG+.
  chooseEnding: (id) => set({ ending: id }),

  newGamePlus: () => {
    const s = get();
    const fresh = makeInitialState(); // a new world — but it keeps what it took
    fresh.prestigeUpgrades = s.prestigeUpgrades;
    fresh.loreProgress = s.loreProgress; // you remember the story
    fresh.replacement = Math.min(100, s.replacement); // the scar persists
    fresh.ending = s.ending;
    fresh.settings = s.settings;
    fresh.codex = s.codex;
    fresh.achievements = s.achievements;
    fresh.discovered = { ...s.discovered };
    fresh.returnCharges = derive(fresh).maxCharges;
    set(fresh);
  },

  claimQuest: (id) => {
    const s = get();
    const q = s.quests.find((x) => x.id === id);
    if (!q || !q.done) return;
    const rewardPatch = applyQuestReward(s, q.reward);
    const quests = s.quests.map((x) => (x.id === id ? rollQuest(s) : x));
    set({ ...rewardPatch, quests });
  },

  resolveEncounter: (reward) =>
    set((s) => {
      const pathStr = s.nav[s.nav.length - 1].data.path.join('.');
      const clearedEncounters = s.clearedEncounters.includes(pathStr)
        ? s.clearedEncounters
        : [...s.clearedEncounters, pathStr];
      return { ...applyQuestReward(s, reward), clearedEncounters };
    }),

  escapeEncounter: () => {
    const s = get();
    if (s.nav.length <= 1) return;
    const { resources, carried } = bankOnAscend(s, 1);
    set({ nav: s.nav.slice(0, s.nav.length - 1), combo: { count: 0, lastTs: 0 }, resources, carried });
  },

  dismissOffline: () => set({ offlineGain: null }),

  dismissBankFlash: () => set({ bankFlash: null }),

  dismissToast: (id) => set((s) => ({ achievementToasts: s.achievementToasts.filter((t) => t.id !== id) })),

  tick: (dt) => {
    const s = get();
    const eff = derive(s);
    const nowMs = Date.now();

    let charges = s.returnCharges;
    let regenAccum = s._regenAccum;
    let regenProgress = s.regenProgress;
    if (charges < eff.maxCharges) {
      regenAccum += dt;
      while (regenAccum >= eff.regenMs && charges < eff.maxCharges) {
        regenAccum -= eff.regenMs;
        charges += 1;
      }
      regenProgress = charges >= eff.maxCharges ? 1 : regenAccum / eff.regenMs;
    } else {
      regenAccum = 0;
      regenProgress = 1;
    }

    let combo = s.combo;
    if (combo.count > 0 && now() - combo.lastTs > eff.comboWindowMs) {
      combo = { count: 0, lastTs: combo.lastTs };
    }

    let playAccum = s._playAccum + dt;
    const patch: Partial<GameState> = {
      returnCharges: charges,
      _regenAccum: regenAccum,
      regenProgress,
    };
    if (combo !== s.combo) patch.combo = combo;
    if (playAccum >= 1000) {
      patch.stats = { ...s.stats, playtimeMs: s.stats.playtimeMs + Math.floor(playAccum) };
      playAccum = playAccum % 1000;
    }
    patch._playAccum = playAccum;

    // Crawler + Background Service production, batched ~5x/sec to limit re-renders.
    // Both bank straight to spendable resources (automated income, not part of the dive haul).
    let prodAccum = s._prodAccum + dt;
    if (prodAccum >= 200) {
      const secs = prodAccum / 1000;
      const crawl = crawlerRate(s);
      const svc = servicesByKind(s);
      const anySvc = RESOURCE_KINDS.some((k) => svc[k].gt(0));
      if (crawl.gt(0) || anySvc) {
        const res = { ...s.resources };
        if (crawl.gt(0)) res.clicks = res.clicks.add(crawl.mul(secs));
        for (const k of RESOURCE_KINDS) if (svc[k].gt(0)) res[k] = res[k].add(svc[k].mul(secs));
        patch.resources = res;
      }
      prodAccum = 0;
    }
    patch._prodAccum = prodAccum;

    // Signal tether: tops up at the surface, drains the deeper you are; at zero the haul bleeds.
    const sigDepth = s.nav.length - 1;
    if (sigDepth <= 0) {
      if (s.signal !== eff.signalMax) patch.signal = eff.signalMax;
    } else {
      const drained = Math.max(0, s.signal - signalDrainPerSec(sigDepth) * eff.signalDrainMult * (dt / 1000));
      if (drained !== s.signal) patch.signal = drained;
      if (drained <= 0) {
        const bleed = LOST_SIGNAL_BLEED_PER_SEC * eff.bleedMult * (dt / 1000);
        let any = false;
        const carried = { ...s.carried };
        for (const k of RESOURCE_KINDS) {
          if (carried[k].gt(0)) {
            carried[k] = carried[k].mul(1 - bleed);
            any = true;
          }
        }
        if (any) patch.carried = carried;
      }
    }

    // Dread (Interference): builds the deeper you linger and the more deep services run; eases near
    // the surface. Lost Signal spikes it. It powers Resonance but invites worse — and feeds Replacement.
    {
      const dpt = s.nav.length - 1;
      const lost = dpt > 0 && (patch.signal ?? s.signal) <= 0;
      const rise = (dpt >= 6 ? (dpt - 5) * 0.03 + s.services.length * 0.01 : 0) + (lost ? 0.6 : 0);
      const decay = dpt < 3 ? 0.08 : 0;
      const dread = Math.max(0, Math.min(100, s.dread + (rise - decay) * (dt / 1000)));
      if (dread !== s.dread) patch.dread = dread;
      // Replacement: the copy completes only in the deep, faster the more it watches (high Dread).
      if (dpt >= 12 && s.replacement < 100) {
        const rep = Math.min(100, s.replacement + (dread / 100) * 0.02 * (dt / 1000));
        if (rep !== s.replacement) patch.replacement = rep;
      }
    }

    // Renewable nodes on the current level re-arm once their cooldown elapses.
    const lvl = s.nav[s.nav.length - 1];
    const cds = lvl.cooldowns;
    if (cds.some((c) => c !== 0 && nowMs >= c)) {
      const collectedArr = lvl.collected.slice();
      const cdArr = cds.slice();
      for (let i = 0; i < cdArr.length; i++) {
        if (cdArr[i] !== 0 && nowMs >= cdArr[i]) {
          cdArr[i] = 0;
          collectedArr[i] = false;
        }
      }
      const nav = s.nav.slice();
      nav[nav.length - 1] = { ...lvl, collected: collectedArr, cooldowns: cdArr };
      patch.nav = nav;
    }

    // Achievements — cheap predicates, checked every tick so resource/idle thresholds catch.
    const newly = newlyUnlocked(s, new Set(s.achievements));
    if (newly.length) {
      patch.achievements = [...s.achievements, ...newly.map((a) => a.id)];
      patch.achievementToasts = [...s.achievementToasts, ...newly.map((a) => ({ id: a.id, name: a.name }))];
      newly.forEach((a) => steamUnlock(a.id));
    }

    // Quest completion flags (claimed manually in the Tasks panel).
    let questsChanged = false;
    const quests = s.quests.map((q) => {
      if (!q.done && questIsDone(s, q)) {
        questsChanged = true;
        return { ...q, done: true };
      }
      return q;
    });
    if (questsChanged) patch.quests = quests;

    set(patch);
  },

  saveNow: async () => {
    await persist(JSON.stringify(serialize(get())));
  },

  loadGame: async () => {
    const raw = await loadRaw();
    if (!raw) return false;
    try {
      const data = JSON.parse(raw) as SaveData;
      const st = deserialize(data);
      const elapsed = Math.min(Date.now() - st.stats.lastSaveTs, derive(st).offlineCapMs);
      let offlineGain: GameState['offlineGain'] = null;
      if (elapsed > 2000) {
        const secs = elapsed / 1000;
        const crawl = crawlerRate(st).mul(secs);
        const svc = servicesByKind(st);
        const res = { ...st.resources };
        const gains: Partial<Record<ResourceKind, Decimal>> = {};
        if (crawl.gt(0)) {
          res.clicks = res.clicks.add(crawl);
          gains.clicks = crawl;
        }
        for (const k of RESOURCE_KINDS) {
          if (svc[k].gt(0)) {
            const add = svc[k].mul(secs);
            res[k] = res[k].add(add);
            gains[k] = (gains[k] ?? D(0)).add(add);
          }
        }
        st.resources = res;
        if (Object.keys(gains).length) offlineGain = gains;
      }
      set({ ...st, offlineGain });
      return true;
    } catch {
      return false;
    }
  },

  resetSave: async () => {
    await clearRaw();
    set(makeInitialState());
  },

  exportSave: () => b64encode(JSON.stringify(serialize(get()))),

  importSave: (code) => {
    try {
      const data = JSON.parse(b64decode(code.trim())) as SaveData;
      if (typeof data.worldSeed !== 'number') return false;
      set(deserialize(data));
      return true;
    } catch {
      return false;
    }
  },
}));
