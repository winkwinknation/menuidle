# Menu Idle

An **incremental / idle horror** game about exploring infinite, procedurally generated menus.
It opens as an ordinary settings app. It does not stay one.

▶ **Play in your browser:** https://winkwinknation.github.io/menuidle/
(works on desktop and mobile)

> ⚠ **Content warning:** Menu Idle becomes a horror game in earnest the deeper you go — body horror,
> existential dread, and an entity that becomes aware of *you*. You can dial the intensity (Off / Mild /
> Full) at any time in Settings; the numbers never change, only the flavor. No flashing/strobing is used.

## What it is

- **Dive** through endless, deterministic menus; collect resources, farm **renewable** nodes, and flip
  **Settings toggles** to run **Background Services** that produce for you forever — even offline.
- **Carry & bank:** loot below the surface is *carried*; climb back to bank it before your **Signal**
  tether runs out.
- **Build** through a branching **Skill Tree** (Collection · Navigation · Signal · Automation · Insight ·
  Resonance), **craft**, run **Rituals**, and **Reboot** for permanent upgrades.
- Go deep and the app turns: **Interference** and **Replacement** rise, dark resources appear, **Echo**
  landmarks reveal the story of **THE OWNER** — building to multiple endings and New Game+.

## Run it locally

```bash
npm install
npm run dev        # Vite + Electron fullscreen desktop build (HMR)
npm run dev:vite   # or just the web app at http://127.0.0.1:5173
npm test           # unit tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run build      # static web build -> dist/
```

## Stack

React + TypeScript + Vite + Zustand + break_infinity.js, with synthesized Web Audio (no asset files).
The web build is a static site (saves to `localStorage`); the desktop build wraps it in Electron with
atomic file saves. Deployed to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
