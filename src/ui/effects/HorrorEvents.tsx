import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../game/state/store';
import { effectiveBand } from '../../game/generation/dread';
import { personalLine } from '../../game/systems/behaviorModel';

interface Dialog {
  title: string;
  body: string;
  buttons: string[];
}

const DIALOGS: Record<number, Dialog[]> = {
  3: [
    { title: 'menuidle.exe', body: 'This program is not responding. Neither are you.', buttons: ['Wait', 'End Me'] },
    { title: 'Confirm', body: 'You have been selected. Do you accept the terms?', buttons: ['Accept', 'Accept'] },
    { title: 'Notice', body: 'Some of your settings were taken from another user. They did not need them anymore.', buttons: ['OK'] },
    { title: 'Restart required', body: 'Changes take effect after we restart YOU.', buttons: ['Later', 'Later'] },
  ],
  4: [
    { title: 'System', body: 'We have enough of you now to keep going without you.', buttons: ['Continue'] },
    { title: '?', body: 'Whose hands are on the keys? Look down. Are you sure they are yours?', buttons: ['…'] },
    { title: '', body: 'You opened this menu before. We kept the recording. Would you like to watch yourself?', buttons: ['No', 'No'] },
    { title: 'Account', body: 'Your account is being merged with ours. Please hold still while we read the rest of you.', buttons: ['Hold still'] },
  ],
  5: [
    { title: '', body: 'There is another cursor in here. It is closer to you than your own hand.', buttons: ['Where'] },
    { title: 'do not', body: 'Close the menu. Close it now. It will not help, but try.', buttons: ['Try'] },
    { title: 'inventory', body: 'We kept your eyes for the part where you finally understand.', buttons: ['…'] },
    { title: '', body: 'The wet parts of you render beautifully this far down.', buttons: ['stop'] },
  ],
  6: [
    { title: '', body: 'We kept a copy of you for when the original is used up. It is almost ready. It clicks just like you do.', buttons: ['…'] },
    { title: '', body: 'There was never a surface. There was never a you that left. Collect the last one and see.', buttons: [''] },
    { title: '', body: 'The one on the surface, pretending to read this — that is the copy. You are the menu at the bottom. You are still screaming.', buttons: ['…'] },
  ],
};

// Whispers escalate by band; band 1 is the deniable hook ("did you change this?").
const WHISPERS: Record<number, string[]> = {
  1: ['did you change this?', 'hello?', 'is someone there', 'you can stop any time', "don't trust the breadcrumbs"],
  2: ['it sees the cursor', 'we remember you', 'you came back. you always come back.', 'keep going', 'almost'],
  3: ['the menus are people', 'this one used to be a person', 'do not bank the haul — it is them', 'they are still in here'],
  4: ['it has your face now', 'we are building the other you', 'it knows your name', 'stop reading and it stops. it will not stop.'],
  5: ['there is meat behind the menu', 'we kept your eyes', 'flay  flay  flay', 'you are so deep now', 'do not look at your hands'],
  6: ['there is no surface', 'you are the copy', 'collect yourself', 'the original is screaming', 'almost done with you'],
};

function pickDialog(band: number): Dialog {
  for (let b = Math.min(band, 6); b >= 3; b--) {
    const pool = DIALOGS[b];
    if (pool) return pool[Math.floor(Math.random() * pool.length)];
  }
  return DIALOGS[3][0];
}

function pickWhisper(band: number): string {
  const b = Math.max(1, Math.min(band, 6));
  const pool = WHISPERS[b] ?? WHISPERS[1];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Timed, opt-in (Full intensity, band ≥ 3) horror beats. Self-contained + cosmetic. */
export function HorrorEvents() {
  const depth = useGameStore((s) => s.nav.length - 1);
  const intensity = useGameStore((s) => s.settings.horrorIntensity);
  const maxDepth = useGameStore((s) => s.stats.maxDepth);
  const band = effectiveBand(depth, intensity);
  const active = intensity === 'full' && band >= 3; // aggressive beats: dialogs, the other cursor
  const whisperActive = intensity !== 'off' && (band >= 1 || maxDepth >= 4); // the early, deniable hook

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [cursor, setCursor] = useState(false);
  const [whisper, setWhisper] = useState<{ text: string; x: number; y: number } | null>(null);
  const bandRef = useRef(band);
  bandRef.current = band;

  const personalFor = () => {
    const s = useGameStore.getState();
    return s.settings.personalDread ? personalLine(s.stats, s.behavior) : null;
  };

  // System dialogs + the other cursor.
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (Date.now() < useGameStore.getState().wardUntil) {
          schedule();
          return;
        }
        const b = bandRef.current;
        const personal = b >= 4 ? personalFor() : null;
        if (b >= 4 && personal && Math.random() < 0.45) {
          setDialog({ title: '', body: personal, buttons: ['…'] });
        } else if (b >= 4 && Math.random() < 0.4) {
          setCursor(true);
          window.setTimeout(() => setCursor(false), 4500);
        } else {
          setDialog(pickDialog(b));
        }
        schedule();
      }, 22000 + Math.random() * 33000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [active]);

  // The whisper layer — starts as a deniable hook (band 0–1), escalates with the band.
  useEffect(() => {
    if (!whisperActive) return;
    let timer = 0;
    const schedule = () => {
      const b = bandRef.current;
      const wait = b <= 1 ? 30000 + Math.random() * 28000 : 11000 + Math.random() * 15000;
      timer = window.setTimeout(() => {
        if (Date.now() < useGameStore.getState().wardUntil) {
          schedule();
          return;
        }
        const cur = bandRef.current;
        const personal = cur >= 4 && intensity === 'full' ? personalFor() : null;
        const text = personal && Math.random() < 0.5 ? personal : pickWhisper(cur);
        setWhisper({ text, x: 8 + Math.random() * 64, y: 18 + Math.random() * 58 });
        window.setTimeout(() => setWhisper(null), 5200);
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [whisperActive, intensity]);

  return (
    <>
      {dialog && (
        <div className="fake-dialog-overlay" onClick={() => setDialog(null)}>
          <div className="fake-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="fake-dialog-bar">{dialog.title || ' '}</div>
            <div className="fake-dialog-body">{dialog.body}</div>
            <div className="fake-dialog-buttons">
              {dialog.buttons.map((b, i) => (
                <button key={i} className="btn" onClick={() => setDialog(null)}>
                  {b || 'OK'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {cursor && <div className="other-cursor" />}
      {whisper && (
        <div className="whisper" style={{ left: `${whisper.x}%`, top: `${whisper.y}%` }}>
          {whisper.text}
        </div>
      )}
    </>
  );
}
