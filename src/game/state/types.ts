import type { Decimal } from '../math/bignum';
import type { MenuData } from '../generation/menuGenerator';
import type { ResourceKind } from '../content/resources';
import type { Intensity } from '../generation/dread';
import type { ThemeId } from '../content/skins';
import type { Behavior } from '../systems/behaviorModel';
import type { Quest } from '../content/quests';
import type { Service } from '../systems/services';

/** One level of the navigation stack: a generated menu + which items are collected.
 *  `cooldowns[i]` is the epoch ms a renewable node becomes harvestable again (0 = ready). */
export interface NavLevel {
  data: MenuData;
  collected: boolean[];
  cooldowns: number[];
}

export interface ComboState {
  count: number;
  lastTs: number;
}

export interface Stats {
  maxDepth: number; // lifetime deepest tier
  runMaxDepth: number; // deepest tier this run (resets on reboot) — drives Cache
  totalCollects: number;
  totalClicksEarned: Decimal;
  playtimeMs: number;
  lastSaveTs: number;
  startedTs: number;
}

export interface Settings {
  masterVolume: number;
  horrorIntensity: Intensity;
  contentAck: boolean; // has the player seen the content warning?
  personalDread: boolean; // double-gated opt-in for clock/playtime/pattern lines
  theme: ThemeId;
  tutorialSeen: boolean; // has the guided tour been completed/skipped?
}

/** The serializable + reactive game data (actions live on the store in addition). */
export interface GameState {
  worldSeed: number;
  nav: NavLevel[];
  resources: Record<ResourceKind, Decimal>; // banked / spendable
  carried: Record<ResourceKind, Decimal>; // unbanked haul — banked by climbing back up
  discovered: Record<ResourceKind, boolean>;
  keys: number; // Access Keys for locked menus
  services: Service[]; // enabled Background Services — persistent idle generators
  signal: number; // the dive tether (0..signalMax); drains below the surface, refills up top
  dread: number; // Interference meter (0..100): rises deep, powers Resonance, invites worse
  replacement: number; // 0..100 — how complete the OWNER's copy of you is (drives the endgame)
  loreProgress: number; // how many ordered Echo fragments have been recovered
  ending: string | null; // which ending was chosen (gates New Game+)
  endingPrompt: boolean; // transient: the ending sequence is open (not saved)
  clearedEncounters: string[]; // path strings of beaten encounters (no re-farming)
  wardUntil: number; // epoch ms — horror events suppressed until then
  surgeUntil: number; // epoch ms — collection doubled until then
  upgrades: Record<string, number>;
  cache: Decimal; // prestige currency (persists across reboots)
  prestigeUpgrades: Record<string, number>; // persistent
  returnCharges: number;
  combo: ComboState;
  regenProgress: number; // 0..1 toward the next charge (display only)
  _regenAccum: number; // ms, internal
  _playAccum: number; // ms, internal (flushed to playtime each second)
  _prodAccum: number; // ms, internal (crawler production batching)
  offlineGain: Partial<Record<ResourceKind, Decimal>> | null; // per-resource idle gains while away
  bankFlash: { amounts: Partial<Record<ResourceKind, Decimal>>; id: number } | null; // transient bank juice
  codex: { types: string[]; themes: string[] }; // discovered menu types & themes
  achievements: string[]; // unlocked achievement ids
  achievementToasts: { id: string; name: string }[]; // transient, not saved
  behavior: Behavior; // how you play — feeds personal dread
  quests: Quest[]; // active System Tasks
  stats: Stats;
  settings: Settings;
  panelRevealed: boolean;
}
