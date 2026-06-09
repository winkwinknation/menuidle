import { useEffect, useState } from 'react';
import { useGameStore } from './game/state/store';
import { fmt, type Decimal } from './game/math/bignum';
import { RESOURCE_INFO, type ResourceKind } from './game/content/resources';
import { derive } from './game/content/upgrades';
import { effectiveBand } from './game/generation/dread';
import { audio } from './audio/audioManager';
import { useGameLoop } from './ui/useGameLoop';
import { ResourceBar } from './ui/hud/ResourceBar';
import { Breadcrumb } from './ui/hud/Breadcrumb';
import { CarriedBar } from './ui/hud/CarriedBar';
import { QuickBuy } from './ui/hud/QuickBuy';
import { SkillTree } from './ui/hud/SkillTree';
import { SettingsModal } from './ui/hud/SettingsModal';
import { PrestigeModal } from './ui/hud/PrestigeModal';
import { CodexModal } from './ui/hud/CodexModal';
import { CraftingModal } from './ui/hud/CraftingModal';
import { QuestsModal } from './ui/hud/QuestsModal';
import { ContentWarning } from './ui/hud/ContentWarning';
import { AchievementToasts } from './ui/hud/AchievementToasts';
import { DiveGauge } from './ui/hud/DiveGauge';
import { DreadMeter } from './ui/hud/DreadMeter';
import { ServicesPanel } from './ui/hud/ServicesPanel';
import { RitualsModal } from './ui/hud/RitualsModal';
import { EndingScreen } from './ui/hud/EndingScreen';
import { BankFlash } from './ui/hud/BankFlash';
import { Tutorial } from './ui/hud/Tutorial';
import { MenuView } from './ui/menus/MenuView';
import { ParticleCanvas } from './ui/effects/ParticleCanvas';
import { DreadOverlay } from './ui/effects/DreadOverlay';
import { HorrorEvents } from './ui/effects/HorrorEvents';

/** Subtle depth tint — the first hint of the dread escalation to come. */
function depthBackground(depth: number): string {
  const d = Math.min(depth, 40);
  const hue = 230 - d * 1.4;
  const sat = 16 + d * 0.5;
  const light = Math.max(7 - d * 0.06, 4);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prestigeOpen, setPrestigeOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [craftOpen, setCraftOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [ritualsOpen, setRitualsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const tutorialSeen = useGameStore((s) => s.settings.tutorialSeen);
  const dreadDiscovered = useGameStore((s) => s.discovered.static);
  const endingPrompt = useGameStore((s) => s.endingPrompt);
  const replacement = useGameStore((s) => s.replacement);
  const lostSignal = useGameStore((s) => s.nav.length - 1 > 0 && s.signal <= 0);
  const anyQuestDone = useGameStore((s) => s.quests.some((q) => q.done));
  const depth = useGameStore((s) => s.nav.length - 1);
  const panelRevealed = useGameStore((s) => s.panelRevealed);
  const servicesCount = useGameStore((s) => s.services.length);
  const maxDepth = useGameStore((s) => s.stats.maxDepth);
  const hasCache = useGameStore((s) => s.cache.gt(0));
  const offlineGain = useGameStore((s) => s.offlineGain);
  const dismissOffline = useGameStore((s) => s.dismissOffline);
  const contentAck = useGameStore((s) => s.settings.contentAck);
  const theme = useGameStore((s) => s.settings.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // First-launch: open the tour once the player has acknowledged the content warning.
  useEffect(() => {
    if (contentAck && !tutorialSeen) setTutorialOpen(true);
  }, [contentAck, tutorialSeen]);

  const showPrestige = maxDepth >= 10 || hasCache;

  useGameLoop();

  // Audio: resume on first gesture; keep volume + ambient bed in sync with state.
  useEffect(() => {
    const onFirst = () => {
      audio.resume();
      window.removeEventListener('pointerdown', onFirst);
    };
    window.addEventListener('pointerdown', onFirst);

    let lastVol = -1;
    let lastDepth = -1;
    let lastInt = '';
    const apply = (s: ReturnType<typeof useGameStore.getState>) => {
      if (s.settings.masterVolume !== lastVol) {
        lastVol = s.settings.masterVolume;
        audio.setVolume(lastVol);
      }
      const d = s.nav.length - 1;
      if (d !== lastDepth || s.settings.horrorIntensity !== lastInt) {
        lastDepth = d;
        lastInt = s.settings.horrorIntensity;
        audio.setAmbient(d, effectiveBand(d, s.settings.horrorIntensity));
      }
    };
    apply(useGameStore.getState());
    const unsub = useGameStore.subscribe(apply);
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      unsub();
    };
  }, []);

  // Heartbeat while the Signal is failing — the body remembering it's in danger.
  useEffect(() => {
    const iv = window.setInterval(() => {
      const s = useGameStore.getState();
      if (s.settings.horrorIntensity === 'off' || s.settings.masterVolume <= 0) return;
      const d = s.nav.length - 1;
      const max = derive(s).signalMax;
      if (d > 0 && max > 0 && s.signal / max < 0.25) audio.heartbeat();
    }, 1100);
    return () => window.clearInterval(iv);
  }, []);

  useEffect(() => {
    let mounted = true;
    useGameStore.getState().loadGame().catch(() => undefined);
    const iv = window.setInterval(() => {
      if (mounted) void useGameStore.getState().saveNow();
    }, 15000);
    const onUnload = () => void useGameStore.getState().saveNow();
    window.addEventListener('beforeunload', onUnload);
    return () => {
      mounted = false;
      window.clearInterval(iv);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  return (
    <div className="app" style={{ background: depthBackground(depth) }}>
      <header className="topbar" data-tour="topbar">
        <ResourceBar />
        <div className="topbar-title">MENU&nbsp;IDLE</div>
        {maxDepth >= 3 && (
          <button className="btn btn-codex btn-tasks" onClick={() => setQuestsOpen(true)} title="System Tasks">
            ▤{anyQuestDone && <span className="task-dot" />}
          </button>
        )}
        {maxDepth >= 5 && (
          <button className="btn btn-codex" onClick={() => setCraftOpen(true)} title="Build">
            🛠
          </button>
        )}
        {(servicesCount > 0 || maxDepth >= 2) && (
          <button className="btn btn-codex btn-services" onClick={() => setServicesOpen(true)} title="Background Services">
            🗂{servicesCount > 0 && <span className="svc-count-dot">{servicesCount}</span>}
          </button>
        )}
        {panelRevealed && (
          <button className="btn btn-codex" onClick={() => setTreeOpen(true)} title="Skill Tree">
            ⌗
          </button>
        )}
        {dreadDiscovered && (
          <button className="btn btn-codex btn-rituals" onClick={() => setRitualsOpen(true)} title="Rituals">
            ⛧
          </button>
        )}
        <button className="btn btn-codex" onClick={() => setCodexOpen(true)} title="Codex">
          ☷
        </button>
        {showPrestige && (
          <button className="btn btn-prestige-top" onClick={() => setPrestigeOpen(true)} title="Reboot the System">
            ◈ Reboot
          </button>
        )}
        <button className="btn btn-codex btn-help" onClick={() => setTutorialOpen(true)} title="How to play (tour)">
          ?
        </button>
        <button className="btn btn-gear" onClick={() => setSettingsOpen(true)} title="Settings">
          ⚙
        </button>
      </header>

      <Breadcrumb />
      <CarriedBar />
      {lostSignal && (
        <div className="lost-signal-banner">
          ⚠ LOST SIGNAL — your haul is bleeding. Climb back (Back) to bank it, or grab a 📶 Signal Boost.
        </div>
      )}

      <div className="body">
        {(maxDepth >= 1 || depth > 0) && <DiveGauge />}
        <main className="stage">
          <MenuView />
        </main>
        {panelRevealed && <QuickBuy onOpenTree={() => setTreeOpen(true)} />}
      </div>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {prestigeOpen && <PrestigeModal onClose={() => setPrestigeOpen(false)} />}
      {codexOpen && <CodexModal onClose={() => setCodexOpen(false)} />}
      {craftOpen && <CraftingModal onClose={() => setCraftOpen(false)} />}
      {questsOpen && <QuestsModal onClose={() => setQuestsOpen(false)} />}
      {treeOpen && <SkillTree onClose={() => setTreeOpen(false)} />}
      {servicesOpen && <ServicesPanel onClose={() => setServicesOpen(false)} />}
      {ritualsOpen && <RitualsModal onClose={() => setRitualsOpen(false)} />}
      {endingPrompt && <EndingScreen />}

      {offlineGain && (
        <div className="modal-overlay" onClick={() => dismissOffline()}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>While you were away</h2>
            </div>
            <p className="danger-text" style={{ color: 'var(--muted)' }}>
              {replacement >= 70
                ? 'Your crawlers came back wearing your handwriting. One of them answered to your name.'
                : replacement >= 35
                  ? "Your crawlers kept working while you were gone. They brought back things that used to be people."
                  : "Your crawlers kept exploring. They went deeper than you'd like."}
            </p>
            <div className="offline-gain-list">
              {(Object.entries(offlineGain) as [ResourceKind, Decimal][]).map(([k, v]) => (
                <div className="offline-gain" key={k}>
                  +{fmt(v)}{' '}
                  <span style={{ color: RESOURCE_INFO[k].color }}>
                    {RESOURCE_INFO[k].icon} {RESOURCE_INFO[k].name}
                  </span>
                </div>
              ))}
            </div>
            <div className="save-actions" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => dismissOffline()}>Collect</button>
            </div>
          </div>
        </div>
      )}

      <DreadMeter />
      <BankFlash />
      <DreadOverlay />
      <ParticleCanvas />
      <HorrorEvents />
      <AchievementToasts />
      {!contentAck && <ContentWarning />}
      {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)} />}
    </div>
  );
}
