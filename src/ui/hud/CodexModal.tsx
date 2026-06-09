import { useGameStore } from '../../game/state/store';
import { TOP_CATEGORIES, getTheme } from '../../game/generation/themes';
import { dreadBand, BAND_NAMES } from '../../game/generation/dread';
import { ACHIEVEMENTS } from '../../game/systems/achievements';
import { LORE } from '../../game/content/lore';

const TYPES = [
  { id: 'list', name: 'List' },
  { id: 'settings', name: 'Settings' },
  { id: 'grid', name: 'Grid' },
  { id: 'dropdown', name: 'Dropdown' },
  { id: 'tabs', name: 'Tabs' },
];

export function CodexModal({ onClose }: { onClose: () => void }) {
  const codex = useGameStore((s) => s.codex);
  const achievements = useGameStore((s) => s.achievements);
  const maxDepth = useGameStore((s) => s.stats.maxDepth);
  const loreProgress = useGameStore((s) => s.loreProgress);

  const bandReached = dreadBand(maxDepth);
  const unlocked = new Set(achievements);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Codex</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>

        <h3 className="group-title">Menu Types ({codex.types.length}/{TYPES.length})</h3>
        <div className="codex-chips">
          {TYPES.map((t) => (
            <span key={t.id} className={'chip' + (codex.types.includes(t.id) ? ' chip-on' : '')}>
              {codex.types.includes(t.id) ? t.name : '???'}
            </span>
          ))}
        </div>

        <h3 className="group-title">Categories Explored ({codex.themes.length}/{TOP_CATEGORIES.length})</h3>
        <div className="codex-chips">
          {TOP_CATEGORIES.map((id) => (
            <span key={id} className={'chip' + (codex.themes.includes(id) ? ' chip-on' : '')}>
              {codex.themes.includes(id) ? getTheme(id).title : '???'}
            </span>
          ))}
        </div>

        <h3 className="group-title">Dread Bands ({Math.min(bandReached + 1, BAND_NAMES.length)}/{BAND_NAMES.length})</h3>
        <div className="codex-chips">
          {BAND_NAMES.map((n, i) => (
            <span key={n} className={'chip' + (i <= bandReached ? ' chip-on chip-dread' : '')}>
              {i <= bandReached ? n : '???'}
            </span>
          ))}
        </div>

        <hr className="modal-rule" />

        <h3 className="group-title">Echoes Recovered ({loreProgress}/{LORE.length})</h3>
        <div className="codex-lore">
          {loreProgress === 0 && (
            <div className="ach-desc">No Echoes yet. Find ⟆ Echo landmarks as you descend — they remember the ones before you.</div>
          )}
          {LORE.slice(0, loreProgress).map((f) => (
            <div key={f.id} className="lore-frag">
              <div className="lore-meta">
                <span className="lore-act">{f.act}</span>
                <span className="lore-speaker">{f.speaker}</span>
              </div>
              <div className="lore-text">{f.text}</div>
            </div>
          ))}
          {loreProgress > 0 && loreProgress < LORE.length && <div className="ach-desc">…more remain, further down.</div>}
        </div>

        <hr className="modal-rule" />

        <h3 className="group-title">Achievements ({unlocked.size}/{ACHIEVEMENTS.length})</h3>
        <div className="codex-achievements">
          {ACHIEVEMENTS.map((a) => {
            const got = unlocked.has(a.id);
            return (
              <div key={a.id} className={'ach' + (got ? ' ach-on' : '')}>
                <span className="ach-mark">{got ? '★' : '☆'}</span>
                <span className="ach-text">
                  <span className="ach-name">{got ? a.name : '???'}</span>
                  <span className="ach-desc">{a.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
