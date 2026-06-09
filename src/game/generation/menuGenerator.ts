// The infinite tree's "bones": pure, deterministic generation from (worldSeed, path).
// Menus are now THEMED (contents belong to the parent topic) and TYPED (List / Settings /
// Grid), and some submenus are "gateways" that look native but open a different type.
import { mulberry32, pick } from './prng';
import { hashPath } from './hash';
import { uniqueLabel, maybeUncanny } from './wordbanks';
import { getTheme, ROOT_THEME_ID, TOP_CATEGORIES } from './themes';
import { resourceValue, harvestValue } from './scaling';
import { dreadBand } from './dread';
import type { Decimal } from '../math/bignum';
import type { ResourceKind } from '../content/resources';
import type { QuestReward } from '../content/quests';

// Note: there is intentionally no "home/warp" item — returning to the Main Menu is
// climbing-only (Return charges), until prestige grants a real reset.
export type ItemKind = 'submenu' | 'resource';
export type MenuType = 'list' | 'settings' | 'grid' | 'dropdown' | 'tabs';
/** Special "destination" menus that give the descent texture (richer content lands per phase). */
export type LandmarkType = 'vault' | 'echo' | 'refusal' | 'anomaly' | 'bottom';

export interface MenuContext {
  theme: string;
  menuType: MenuType;
  encounter?: boolean;
}

export interface MenuItem {
  index: number;
  kind: ItemKind;
  label: string;
  value?: Decimal; // resource items
  isKey?: boolean; // resource item that grants an Access Key instead
  signalBoost?: boolean; // resource item that refills the Signal tether instead of a resource
  harvestKind?: ResourceKind; // a dark resource scraped from the deep (overrides the menu's resource)
  renewable?: boolean; // resource node that re-arms after a cooldown (farmable)
  cooldownMs?: number; // renewable: ms before it can be harvested again
  installable?: boolean; // can be enabled as a Background Service (Settings toggles)
  final?: boolean; // The Bottom's single item — collecting it opens the ending
  childTheme?: string; // submenu items
  childType?: MenuType; // submenu items
  locked?: boolean; // submenu that needs a Key to open
  childEncounter?: boolean; // submenu that opens a gauntlet
}

export interface EncounterSpec {
  target: number; // resource items to clear
  timeMs: number; // time limit
  reward: QuestReward;
}

export interface MenuData {
  path: number[];
  depth: number;
  seed: number;
  theme: string;
  menuType: MenuType;
  items: MenuItem[];
  encounter?: EncounterSpec; // a gauntlet that fights back
  landmark?: LandmarkType; // a special destination menu
}

const ROOT_CONTEXT: MenuContext = { theme: ROOT_THEME_ID, menuType: 'list' };

// Keep resources per menu at/under the themed pool sizes so labels stay coherent
// (no "(2)" fallbacks); the rest become submenus — more menus to explore anyway.
const MAX_RESOURCES = 5;

// Generic qualifiers that expand on-theme submenu variety, e.g. "Advanced Output".
const ADJ = ['Advanced', 'General', 'Legacy', 'Custom', 'Default', 'Extended', 'Basic', 'Hidden', 'Quick', 'More'];

function shuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mostly List; occasional other types — these are the "gateways" between kinds of menu. */
function pickMenuType(rng: () => number): MenuType {
  const r = rng();
  if (r < 0.12) return 'settings';
  if (r < 0.2) return 'grid';
  if (r < 0.3) return 'dropdown';
  if (r < 0.37) return 'tabs';
  return 'list';
}

// Labels for harvested dark resources — deliberately wrong for a "settings app".
const HARVEST_LABEL: Record<string, string> = {
  static: 'untitled (static)',
  sigils: 'a marked entry',
  viscera: 'something wet',
  names: 'a name, almost yours',
  marrow: 'load-bearing tissue',
};

/** A dark resource scraped from this depth, if any. Draws one rng() only once dread begins (band>=1),
 *  so shallow generation is unchanged. Deeper bands unlock rarer, worse harvests. */
function pickHarvest(rng: () => number, depth: number): ResourceKind | undefined {
  const band = dreadBand(depth);
  if (band < 1) return undefined;
  const r = rng();
  if (band >= 5 && r < 0.05) return 'marrow';
  if (band >= 4 && r < 0.07) return 'names';
  if (band >= 3 && r < 0.1) return 'viscera';
  if (band >= 2 && r < 0.12) return 'sigils';
  if (r < 0.14) return 'static';
  return undefined;
}

/** Rare, depth-gated "destination" menus. Draws exactly one rng() (only at depth>=4) so the rest of
 *  the menu stays deterministic. Richer per-type content is layered in by later phases. */
function pickLandmark(rng: () => number, depth: number): LandmarkType | undefined {
  if (depth < 4) return undefined;
  const r = rng();
  if (depth >= 240 && r < 0.08) return 'bottom'; // the deepest dark — the original
  if (depth >= 12 && r < 0.05) return 'refusal';
  if (depth >= 8 && r < 0.11) return 'anomaly';
  if (depth >= 6 && r < 0.17) return 'vault';
  if (r < 0.24) return 'echo';
  return undefined;
}

/** The context a child menu will have, read from its parent's submenu item. */
export function childContext(parent: MenuData, index: number): MenuContext {
  const it = parent.items[index];
  if (it && it.kind === 'submenu' && it.childTheme) {
    return { theme: it.childTheme, menuType: it.childType ?? 'list', encounter: it.childEncounter };
  }
  return { theme: 'system', menuType: 'list' };
}

function encounterReward(rng: () => number, depth: number): QuestReward {
  const r = rng();
  if (r < 0.2) return { type: 'keys', amount: 1 };
  if (r < 0.35) return { type: 'cache', amount: 1 };
  const kinds: ('clicks' | 'data' | 'packets' | 'tokens')[] = ['clicks', 'data', 'packets', 'tokens'];
  return { type: 'resource', kind: kinds[Math.floor(rng() * kinds.length)], tier: depth + 2 };
}

/** Resolve a menu's context cold by walking up the (deterministic) chain to the root. */
export function resolveContext(worldSeed: number, path: number[]): MenuContext {
  if (path.length === 0) return ROOT_CONTEXT;
  const parent = generateMenu(worldSeed, path.slice(0, -1));
  return childContext(parent, path[path.length - 1]);
}

function decideKinds(rng: () => number, count: number): ItemKind[] {
  const kinds: ItemKind[] = [];
  let resCount = 0;
  for (let i = 0; i < count; i++) {
    let k: ItemKind = rng() < 0.5 ? 'resource' : 'submenu';
    if (k === 'resource') {
      if (resCount >= MAX_RESOURCES) k = 'submenu';
      else resCount++;
    }
    kinds.push(k);
  }
  if (!kinds.includes('submenu')) kinds[count - 1] = 'submenu';
  if (!kinds.includes('resource')) kinds[0] = 'resource';
  return kinds;
}

function resourceLabel(rng: () => number, themeId: string, menuType: MenuType): string {
  const t = getTheme(themeId);
  const pool = menuType === 'settings' ? t.toggles : menuType === 'grid' ? t.tiles : t.actions;
  const src = pool.length ? pool : getTheme('system').actions;
  return pick(rng, src);
}

export function generateMenu(worldSeed: number, path: number[], ctx?: MenuContext): MenuData {
  const seed = hashPath(worldSeed, path);
  const rng = mulberry32(seed);
  const depth = path.length;
  const context = ctx ?? resolveContext(worldSeed, path);
  const { theme: themeId, menuType } = context;
  const used = new Set<string>();
  const items: MenuItem[] = [];

  if (themeId === ROOT_THEME_ID) {
    // The Main Menu is a hub: every top-level category, then a couple quick actions.
    const cats = shuffle(rng, TOP_CATEGORIES);
    for (const catId of cats) {
      items.push({
        index: items.length,
        kind: 'submenu',
        label: uniqueLabel(rng, used, () => getTheme(catId).title),
        childTheme: catId,
        childType: pickMenuType(rng),
      });
    }
    const quickCount = 2;
    for (let i = 0; i < quickCount; i++) {
      items.push({
        index: items.length,
        kind: 'resource',
        label: uniqueLabel(rng, used, () => resourceLabel(rng, ROOT_THEME_ID, 'list')),
        value: resourceValue(0, 0.6 + rng() * 0.8),
      });
    }
    return { path, depth, seed, theme: themeId, menuType, items };
  }

  // Encounter: a contained gauntlet of resource items, on a timer, that fights back.
  if (context.encounter) {
    const target = 4 + Math.floor(rng() * 4);
    const timeMs = 8000 + Math.floor(rng() * 7000);
    const gItems: MenuItem[] = [];
    for (let i = 0; i < target; i++) {
      gItems.push({
        index: i,
        kind: 'resource',
        label: uniqueLabel(rng, used, () => resourceLabel(rng, themeId, 'list')),
        value: resourceValue(depth, 0.8 + rng() * 0.6),
      });
    }
    const reward = encounterReward(rng, depth);
    return { path, depth, seed, theme: themeId, menuType: 'list', items: gItems, encounter: { target, timeMs, reward } };
  }

  const def = getTheme(themeId);
  const landmark = pickLandmark(rng, depth);

  // The Refusal — a boss gauntlet that will not let you leave until it is cleared.
  if (landmark === 'refusal') {
    const target = 6 + Math.floor(rng() * 5);
    const timeMs = 9000 + Math.floor(rng() * 8000);
    const gItems: MenuItem[] = [];
    for (let i = 0; i < target; i++) {
      gItems.push({
        index: i,
        kind: 'resource',
        label: uniqueLabel(rng, used, () => resourceLabel(rng, themeId, 'list')),
        value: resourceValue(depth, 1.0 + rng() * 0.8),
      });
    }
    const reward = encounterReward(rng, depth);
    return { path, depth, seed, theme: themeId, menuType: 'list', items: gItems, encounter: { target, timeMs, reward }, landmark };
  }

  // The Bottom — a single item with your face. Collecting it opens the ending.
  if (landmark === 'bottom') {
    const item: MenuItem = {
      index: 0,
      kind: 'resource',
      label: 'the original — it still has your face',
      value: harvestValue(depth),
      harvestKind: 'marrow',
      final: true,
    };
    return { path, depth, seed, theme: themeId, menuType: 'list', items: [item], landmark };
  }

  // A Vault is a hoard: its finds are worth far more (it's gated behind a Key to reach).
  const valueBoost = landmark === 'vault' ? 3.5 : 1;
  const count = 4 + Math.floor(rng() * (4 + Math.min(depth, 8)));
  const kinds = decideKinds(rng, count);
  const usedChildThemes = new Set<string>();

  kinds.forEach((kind, i) => {
    if (kind === 'submenu') {
      // Branch to a related theme (kept distinct within this menu) or drill deeper on-theme.
      let childTheme = themeId;
      if (def.children.length && rng() < 0.45) {
        for (let t = 0; t < 4; t++) {
          const c = pick(rng, def.children);
          if (!usedChildThemes.has(c)) {
            usedChildThemes.add(c);
            childTheme = c;
            break;
          }
        }
      }
      const onTheme = childTheme === themeId;
      const label = uniqueLabel(rng, used, () => {
        const pool = onTheme
          ? def.entries.length
            ? def.entries
            : [def.title]
          : [getTheme(childTheme).title, ...getTheme(childTheme).entries];
        const word = pick(rng, pool);
        // Occasionally qualify on-theme topics ("Advanced Output") to widen the label space.
        const base = rng() < (onTheme ? 0.4 : 0.25) ? `${pick(rng, ADJ)} ${word}` : word;
        return maybeUncanny(rng, depth, base);
      });
      const locked = depth >= 8 && rng() < 0.12;
      const childEncounter = depth >= 12 && rng() < 0.05;
      items.push({ index: i, kind, label, childTheme, childType: pickMenuType(rng), locked, childEncounter });
    } else {
      const isKey = depth >= 5 && rng() < 0.06;
      const isSignal = !isKey && depth >= 3 && rng() < 0.08;
      const harvest = !isKey && !isSignal ? pickHarvest(rng, depth) : undefined;
      const item: MenuItem = {
        index: i,
        kind,
        label: isKey
          ? '🔑 Access Key'
          : isSignal
            ? '📶 Signal Boost'
            : harvest
              ? HARVEST_LABEL[harvest]
              : uniqueLabel(rng, used, () => resourceLabel(rng, themeId, menuType)),
      };
      if (isKey) {
        item.isKey = true;
      } else if (isSignal) {
        item.signalBoost = true;
      } else if (harvest) {
        // A dark resource scraped from the deep — not the menu's normal yield.
        item.harvestKind = harvest;
        item.value = harvestValue(depth, 0.8 + rng() * 0.6);
      } else {
        item.value = resourceValue(depth, (0.6 + rng() * 0.8) * valueBoost);
        if (menuType === 'settings') {
          // Settings toggles are switches for Background Services (persistent generators).
          item.installable = true;
        } else if (rng() < 0.35) {
          // A third of other nodes are renewable — farmable taps that re-arm on a cooldown.
          item.renewable = true;
          item.cooldownMs = 6000 + Math.floor(rng() * 6000);
        }
      }
      items.push(item);
    }
  });

  return { path, depth, seed, theme: themeId, menuType, items, landmark };
}
