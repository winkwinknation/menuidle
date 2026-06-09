import { useGameStore } from '../../game/state/store';
import { fmt, type Decimal } from '../../game/math/bignum';
import { RITUALS, ritualCost, canPerform, SEVERANCE_REPLACEMENT } from '../../game/content/rituals';
import { RESOURCE_INFO, type ResourceKind } from '../../game/content/resources';
import { audio } from '../../audio/audioManager';

export function RitualsModal({ onClose }: { onClose: () => void }) {
  useGameStore((s) => s.resources);
  useGameStore((s) => s.discovered);
  useGameStore((s) => s.replacement);
  const perform = useGameStore((s) => s.performRitual);

  const s = useGameStore.getState();
  const visible = RITUALS.filter((r) => r.reveal(s));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Rituals</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>
        <p className="danger-text">Spend what you scrape from the deep. Some of it spends you back.</p>
        {visible.length === 0 && <p className="danger-text">Descend further. There is nothing to spend yet — and nothing to spend it on.</p>}

        <div className="prestige-list">
          {visible.map((r) => {
            const cost = ritualCost(s, r);
            const can = canPerform(s, r);
            const severance = r.effect === 'severance';
            const locked = severance && s.replacement < SEVERANCE_REPLACEMENT;
            return (
              <div key={r.id} className={'quest' + (severance ? ' quest-done' : '')}>
                <div className="quest-top">
                  <span className="quest-label">{r.name}</span>
                  <span className="recipe-cost">
                    {(Object.entries(cost) as [ResourceKind, Decimal][]).map(([k, c]) => (
                      <span key={k} style={{ color: RESOURCE_INFO[k].color, marginLeft: 8 }}>
                        {RESOURCE_INFO[k].icon} {fmt(c)}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="upgrade-desc">{r.desc}</div>
                <div className="quest-foot">
                  {locked ? (
                    <span className="danger-text" style={{ margin: 0 }}>
                      The copy must reach {SEVERANCE_REPLACEMENT}% — currently {Math.round(s.replacement)}%
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    className="btn btn-claim"
                    disabled={!can}
                    onClick={() => {
                      audio.purchase();
                      perform(r.id);
                      if (severance) onClose();
                    }}
                  >
                    Perform
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
