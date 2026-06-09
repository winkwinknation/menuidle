import { useState } from 'react';
import { useGameStore } from '../../game/state/store';
import type { Intensity } from '../../game/generation/dread';

const OPTIONS: { id: Intensity; label: string; desc: string }[] = [
  { id: 'full', label: 'Full', desc: 'The intended experience. Body horror, explicit imagery, existential dread, and an entity that speaks to you directly. It does not let up.' },
  { id: 'mild', label: 'Mild', desc: 'Atmosphere, dread and the story — but none of the gore, the personal address, or the worst of it.' },
  { id: 'off', label: 'Off', desc: 'Disable the horror dressing entirely. The mechanics are identical — only the flavor changes.' },
];

/** First-launch gate. The menus start mundane and slowly turn — the player chooses how far. */
export function ContentWarning() {
  const [personal, setPersonal] = useState(false);

  const choose = (id: Intensity) => {
    useGameStore.setState((s) => ({
      settings: {
        ...s.settings,
        horrorIntensity: id,
        contentAck: true,
        personalDread: id === 'full' && personal,
      },
    }));
  };

  return (
    <div className="modal-overlay warn-overlay">
      <div className="modal warn-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="warn-title">Content warning</h2>
        <p className="warn-body">
          <strong>Menu Idle</strong> opens as an ordinary settings app. It does not stay one. The deeper you
          go, the more it becomes a horror game in earnest — themes of bodily harm and gore, the dead rendered
          as interface, loss of self and identity, and an entity that becomes aware of <em>you</em> and means
          you harm. The surface is the bait.
        </p>
        <p className="warn-body warn-muted">
          Choose how far it goes. You can change this any time in Settings — turning it down never makes you
          weaker, it only changes the flavor. (No flashing/strobing is used.)
        </p>

        <label className="warn-check">
          <input type="checkbox" checked={personal} onChange={(e) => setPersonal(e.target.checked)} />
          <span>
            Let it read my real clock, playtime and habits and use them against me. <em>(Full only — the most
            invasive option. Nothing ever leaves your machine.)</em>
          </span>
        </label>

        <div className="warn-options">
          {OPTIONS.map((o) => (
            <button key={o.id} className="warn-option" onClick={() => choose(o.id)}>
              <span className="warn-option-label">{o.label}</span>
              <span className="warn-option-desc">{o.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
