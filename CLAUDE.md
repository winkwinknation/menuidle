# Menu Idle — Project Guide

A **fullscreen incremental/idle horror game for Steam** about exploring infinite, procedurally
generated menus. Mundane on the surface (a settings app), it slowly turns into psychological/cosmic
horror the deeper you dive. Built this repo from scratch; this file is the entry point for any new
session.

## Run / build / test

```bash
npm install          # first time
npm run dev          # Vite dev server + Electron fullscreen window (HMR)
npm test             # Vitest (46 tests)
npm run typecheck    # tsc --noEmit
npm run build        # vite build -> dist/ (static web build; relative base './')
```

- **Live web build:** https://winkwinknation.github.io/menuidle/ — repo `winkwinknation/menuidle`,
  auto-deployed from `main` by `.github/workflows/deploy.yml` (GitHub Pages, Actions source). The web
  build is pure-browser (saves to `localStorage` via the `saveManager` fallback); Electron is desktop-only.
  `vite.config.ts` `base: './'` keeps asset paths relative so the same `dist/` works on Pages *and* Electron.
- **Responsive:** `global.css` has `@media (max-width: 768px)` (and 420px) rules — body stacks, the Dive
  rail becomes a horizontal Signal strip (fill driven by a `--sig` CSS var), QuickBuy goes full-width,
  modals/skill-tree go near-fullscreen. Playable on phones (touch = tap; skill tree pans via overflow scroll).
- **F11** toggles fullscreen, **Esc** exits fullscreen. Auto-saves every 15s.
- **Gotcha (already handled):** VSCode/terminals export `ELECTRON_RUN_AS_NODE=1`, which makes
  `electron .` boot as plain Node (`app` is undefined). `scripts/dev-electron.js` deletes that var
  and spawns the real binary; `npm run dev` and `start` use it. Don't revert to bare `electron .`.
- Steam packaging (electron-builder) is configured (`electron-builder.yml`) but **not yet wired/shipped**.

## Stack

Electron + React + TypeScript + Vite + **Zustand** (state) + **break_infinity.js** (`bignum.ts`, big
numbers). Synthesized Web Audio (no asset files). Electron main/preload are plain CommonJS in
`electron/` (no build step).

## Architecture (the important ideas)

- **The menu tree is never stored.** Each menu is generated deterministically from
  `hash(worldSeed + path)` (`src/game/generation/`: `prng.ts`, `hash.ts`, `menuGenerator.ts`). The
  save persists only the **current path** + per-level collected flags + flat state.
- **Bones vs flesh.** Generation (`menuGenerator.ts`) is the deterministic "bones" — item kinds,
  values, types, themes. The horror/dread layer (`dread.ts`) is presentation-only "flesh" that must
  **never alter the economy** (label/breadcrumb corruption, watcher eyes, glitch).
- **Themed + typed menus.** `themes.ts` gives each category its own vocabulary so submenus *belong*
  to their parent. Menu types: List/Settings/Grid/Dropdown/Tabs, each its own resource + interaction;
  some submenus are "gateways" that open a different type. `childTheme`/`childType`/`childEncounter`
  on a parent item drive the child via `childContext()`.
- **State** lives in one Zustand store (`src/game/state/store.ts`); types in `state/types.ts`;
  read-helpers in `state/selectors.ts`. A fixed-ish RAF loop (`ui/useGameLoop.ts` → `store.tick`)
  drives idle production, charge regen, achievements, quest flags.
- **Save** is versioned JSON (`src/game/save/schema.ts`, `saveManager.ts`), atomic writes + backup
  via Electron IPC (`electron/main.js`), localStorage fallback in browser. **Currently v8** with
  forward migrations in `deserialize`. Bump `CURRENT_VERSION` + add a field default when adding state.
- **Content is data-driven** (`src/game/content/`): `upgrades.ts`, `prestige.ts`, `quests.ts`,
  `crafting.ts`, `resources.ts`, `skins.ts`, `achievements.ts`. Add content here, not engine code.
- **Tuning knobs are centralized:** value/cost curves in `generation/scaling.ts`; upgrade
  numbers/`collectMultiplier()` in `content/upgrades.ts`; crawler math in `systems/automation.ts`.

## Systems implemented (all working, verified)

Core loop · the **Return economy redesigned as carry & bank** (collect below the surface fills an
unbanked `carried` haul; climbing back banks it proportionally — `bankOnAscend` in store.ts; crawlers
auto-bank) · 4 resources (Clicks/Data/Packets/Tokens) + **Access Keys** + locked menus · automation
(crawlers + offline progress) · **two-layer-ready prestige** ("Reboot" → Cache → permanent upgrades) ·
**crafting** (Key/Ward/Surge, depth-scaled costs) · **quests** (rotating System Tasks) · **encounters**
(timed gauntlets; cleared ones don't re-farm — `clearedEncounters`) · juice (synth audio, pooled
particle canvas, screen shake, combos) · **dread system** (bands B0–B6, label corruption, DreadOverlay,
intensity Off/Mild/Full + first-launch ContentWarning) · **adaptive/personal dread** (`behaviorModel.ts`
+ double-gated `personalDread` opt-in) · **horror events** (fake dialogs, ghost cursor, watcher eyes,
breadcrumb erasure, whispers) · **Codex + Achievements** (toasts + `systems/steam.ts` stub via
`setSteamBridge`) · **theme skins** (Corporate/Retro/Neon).

### The Deep Overhaul (2026-06-08) — major expansion, all green (typecheck + 44 tests + build)

Blueprint: `C:\Users\loran\.claude\plans\cosmic-kindling-origami.md`. Delivered:
- **Living menus** — `renewable` resource nodes that re-arm on a cooldown (`NavLevel.cooldowns`, tick
  re-arms); **Background Services** (`systems/services.ts`): Settings toggles become persistent idle
  generators (saved `services[]`, slot-capped via `derive().serviceSlots`, paid in tick + offline).
- **Expeditions** — the **Signal** tether (`systems/signal.ts`): drains below the surface, refilled by
  `signalBoost` items, Lost-Signal bleeds the carried haul (idle-safe). **Landmarks** (`MenuData.landmark`:
  vault/echo/refusal/anomaly/bottom) + a **Dive Gauge** rail (`ui/hud/DiveGauge.tsx`).
- **Skill tree shop** — `UpgradePanel` retired for `ui/hud/SkillTree.tsx` (node graph, `branch/pos/requires`)
  + a docked `QuickBuy` rail. ~31 upgrade nodes across Collection/Navigation/Signal/Automation/Insight/
  **Resonance**; all effects flow through `derive()` + `effectiveCost()`. Prestige expanded (p-slots/
  service/signal/effigy).
- **Horror economy** — 5 depth-gated dark resources (`static→sigils→viscera→names→marrow`), harvested via
  `item.harvestKind` flags. **Dread (Interference)** + **Replacement** meters (`store.tick`, `ui/hud/
  DreadMeter.tsx`); **Resonance** branch turns Dread into power (parity across intensities).
- **Rituals** (`content/rituals.ts` + `RitualsModal`) — Offering/Sigil-Rite/Effigy/Severance, the dark-
  resource sinks. **Lore** (`content/lore.ts`, recovered at Echo landmarks → Codex "Echoes" tab) telling
  the **THE OWNER** story across Acts I–IV → **endings** (`EndingScreen.tsx`: Feed/Refuse/Hollow) +
  **New Game+** (keeps prestige + lore + the Replacement scar).
- Horror content **rewritten to actually terrify** (threats, body horror, the OWNER's address), earlier
  whisper hook, honest `ContentWarning`. Bands re-tuned `[12,24,45,80,140,240]`.

Full earlier design doc / history: `C:\Users\loran\.claude\plans\jolly-painting-sedgewick.md`.

## Status & next steps (where we left off)

The Deep Overhaul (Phases A–F) is **complete and green** (typecheck + 46 tests + build). Phase C/F polish
landed: per-resource offline summary, **bank-the-haul** flash (`BankFlash.tsx` + `bankFlash` state +
`audio.bank()`), dread-driven **voice ambient layer** + landmark sting + low-Signal heartbeat, and bespoke
**Refusal** (trapping boss encounter) + **The Bottom** (`item.final` → ending) landmark menus. Extra nodes
added (overclock/swarm/devour) + more Echo fragments.

Only remaining work:
1. **Steam integration + packaging** (the one item the user deferred) — wire `steamworks.js` behind
   `systems/steam.ts`'s `setSteamBridge` (achievements, cloud saves); finish `electron-builder` Windows
   build. Horror is intentionally NOT gated for shippability — go all-out.
2. **Balance playtest** — the overhaul's numbers (service/signal/harvest curves in `scaling.ts`, Resonance
   slopes, ritual costs, dread/replacement rates in `store.tick`) are **first-pass** and want a real
   fresh-save → first-prestige → ending run to dial pacing.

## Conventions

- Add gameplay as **data in `content/*`**; keep the engine generic.
- When adding saved state: add to `GameState` (`types.ts`), `makeInitialState`, and
  `schema.ts` (SaveData field + serialize + deserialize default), and bump `CURRENT_VERSION`.
- Horror is now a **declared mechanic** (horror resources, Dread/Replacement, Resonance, Rituals, endings),
  but the **cosmetic corruption layer** (`generation/dread.ts` label/watcher) still never *silently* alters
  numbers. **Intensity is a parity-preserving accessibility dial:** numbers are identical Off/Mild/Full —
  only flavor/gore/personal beats change (personal address still double-gated: Full + `personalDread`).
  Per the user: go all-out on horror, don't soften for shippability. One hard line: photosensitivity-safe
  (no harsh strobing; zalgo/static bounded).
- Run `npm run typecheck && npm test` before considering a change done.
