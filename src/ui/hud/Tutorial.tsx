import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useGameStore } from '../../game/state/store';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Step {
  target?: string; // data-tour key; absent = centered card
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Menu Idle',
    body: 'You explore an endless settings app that slowly stops being one. This tour explains every part of the screen. You can reopen it any time with the ? button in the top-right.',
  },
  {
    target: 'menu',
    title: 'The menu',
    body: 'Click a row with a › to open it and go one tier deeper. Click a resource row to collect it. Watch for ♻ renewable nodes (they refill on a timer — farm them), 📶 Signal Boosts, and — in Settings menus — toggles, which switch on Background Services that keep producing for you forever, even while you are away.',
  },
  {
    target: 'resources',
    title: 'Your resources',
    body: 'Each menu type pays a different resource: ◆ Clicks (List), ▦ Data (Settings), ⬡ Packets (Grid), ⬢ Tokens (Dropdown). They appear here as you discover them, alongside 🔑 Keys (open locked menus) and your combo multiplier for fast collecting. Stranger, darker resources show up deeper down.',
  },
  {
    target: 'dive',
    title: 'Depth & Signal',
    body: 'This rail shows how deep you are and your Signal tether. Signal drains while you are below the surface — faster the deeper you go. If it hits zero you enter LOST SIGNAL and your haul starts bleeding, so climb back or grab a 📶 Signal Boost. Landmarks you pass appear on the ribbon.',
  },
  {
    title: 'Carry & bank — the core loop',
    body: 'Anything you collect below the surface is CARRIED (unbanked) — it shows in the 🎒 strip near the top, not yet in your totals. Press Back to climb: climbing BANKS your haul into your real resources (with a gold flash). So the loop is: dive for richer loot, then climb to keep it before your Signal runs out.',
  },
  {
    target: 'shop',
    title: 'Upgrades & the Skill Tree',
    body: 'Spend resources on upgrades in this rail. Click ⌗ Tree (here or in the top bar) for the full branching Skill Tree — Collection, Navigation, Signal, Automation, Insight, and the deep Resonance branch. Nodes unlock outward as you buy their prerequisites.',
  },
  {
    target: 'topbar',
    title: 'The toolbar (top-right)',
    body: 'Your tools appear as you unlock each system: ▤ Tasks · 🛠 Build · 🗂 Services (manage your idle generators) · ⌗ Skill Tree · ⛧ Rituals (spend dark resources) · ☷ Codex (menu types, dread bands, and the recovered story) · ◈ Reboot (prestige) · ⚙ Settings · ? (this tour).',
  },
  {
    target: 'dread',
    title: 'Interference & Replacement',
    body: 'Go deep and the app turns on you. INTERFERENCE rises the longer you linger and the more deep Services you run — it powers the Resonance upgrades but invites worse events. REPLACEMENT is how complete the System’s copy of YOU is; it climbs with deep play and every Reboot. To bring Interference DOWN: climb back toward the surface (it decays up top), stop running deep Services, or perform an ⛧ Offering ritual / craft a Ward to suppress events for a while.',
  },
  {
    title: 'The deep economy & the story',
    body: 'Deep menus drop dark resources — Static, Sigils, Viscera, Names, Marrow. Spend them in ⛧ Rituals and the Resonance branch. Find ⟆ Echo landmarks to recover the story, readable in Codex → Echoes. It builds toward an ending — and a New Game+.',
  },
  {
    title: 'Reboot to grow',
    body: 'Once you have gone deep enough, ◈ Reboot trades your current run for Cache — permanent upgrades that survive every reset and make the next dive faster. Your Services and crawlers keep earning while you are away.',
  },
  {
    title: 'You’re ready',
    body: 'Tune the horror any time in ⚙ Settings (Off / Mild / Full — the numbers never change, only the flavor). Reopen this tour with ? whenever you like. Now go find the bottom.',
  },
];

const PAD = 8;

/** A guided spotlight tour. Highlights whatever target is on-screen; missing targets (features not
 *  yet unlocked) fall back to a centered card so nothing goes unexplained. */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(280);
  const step = STEPS[i];

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, rect]);

  useEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      const r = el ? el.getBoundingClientRect() : null;
      setRect(r && r.width > 0 ? r : null);
    };
    measure();
    window.addEventListener('resize', measure);
    const iv = window.setInterval(measure, 300); // track layout shifts / HMR
    return () => {
      window.removeEventListener('resize', measure);
      window.clearInterval(iv);
    };
  }, [step.target]);

  const finish = () => {
    useGameStore.setState((s) => ({ settings: { ...s.settings, tutorialSeen: true } }));
    onClose();
  };
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : finish());
  const back = () => setI((v) => Math.max(0, v - 1));

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const CARD_W = rect ? 340 : 380;

  const spotStyle: CSSProperties | null = rect
    ? { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  // Always keep the card fully on-screen: pick a side with room, then clamp to the viewport.
  let left: number;
  let top: number;
  if (rect) {
    left = clamp(rect.left, 12, vw - CARD_W - 12);
    const below = rect.bottom + 16;
    const above = rect.top - cardH - 16;
    top = below + cardH <= vh - 12 ? below : above >= 12 ? above : below;
  } else {
    left = (vw - CARD_W) / 2;
    top = (vh - cardH) / 2;
  }
  top = clamp(top, 12, Math.max(12, vh - cardH - 12));
  const cardStyle: CSSProperties = { left, top, width: CARD_W, maxHeight: vh - 24, overflowY: 'auto' };

  return (
    <div className={'tut-overlay' + (rect ? '' : ' tut-dim')}>
      {spotStyle && <div className="tut-spot" style={spotStyle} />}
      <div className="tut-card" ref={cardRef} style={cardStyle}>
        <div className="tut-step">
          {i + 1} / {STEPS.length}
        </div>
        <h3 className="tut-title">{step.title}</h3>
        <p className="tut-body">{step.body}</p>
        <div className="tut-actions">
          <button className="tut-skip" onClick={finish}>Skip tour</button>
          <span style={{ flex: 1 }} />
          {i > 0 && <button className="btn" onClick={back}>Back</button>}
          <button className="btn btn-prestige" onClick={next}>{i < STEPS.length - 1 ? 'Next ›' : 'Done'}</button>
        </div>
      </div>
    </div>
  );
}
