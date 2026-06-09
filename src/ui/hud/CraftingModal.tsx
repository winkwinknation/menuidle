import { useGameStore } from '../../game/state/store';
import { fmt, type Decimal } from '../../game/math/bignum';
import { RECIPES, canCraft, recipeCost } from '../../game/content/crafting';
import { RESOURCE_INFO, type ResourceKind } from '../../game/content/resources';
import { audio } from '../../audio/audioManager';

export function CraftingModal({ onClose }: { onClose: () => void }) {
  useGameStore((s) => s.resources); // reactive to affordability
  useGameStore((s) => s.stats.maxDepth);
  const craft = useGameStore((s) => s.craft);
  const s = useGameStore.getState();
  const visible = RECIPES.filter((r) => r.reveal(s));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Build</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>
        <p className="danger-text" style={{ color: 'var(--muted)' }}>
          Combine surplus resources into Keys and timed consumables.
        </p>

        {visible.length === 0 && <p className="warn-muted">Nothing to build yet. Go deeper.</p>}

        <div className="prestige-list">
          {visible.map((r) => {
            const ok = canCraft(s, r);
            return (
              <button
                key={r.id}
                className={'upgrade' + (ok ? ' upgrade-affordable' : '')}
                disabled={!ok}
                onClick={() => {
                  audio.purchase();
                  craft(r.id);
                }}
              >
                <div className="upgrade-head">
                  <span className="upgrade-name">{r.name}</span>
                </div>
                <div className="upgrade-desc">{r.desc}</div>
                <div className="upgrade-foot recipe-inputs">
                  {(Object.entries(recipeCost(s, r)) as [ResourceKind, Decimal][]).map(([k, cost]) => (
                    <span key={k} className="recipe-cost" style={{ color: RESOURCE_INFO[k].color }}>
                      {RESOURCE_INFO[k].icon} {fmt(s.resources[k])}/{fmt(cost)}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
