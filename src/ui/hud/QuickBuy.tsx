import { useGameStore } from '../../game/state/store';
import { fmt } from '../../game/math/bignum';
import { visibleUpgrades, canAfford, requiresMet } from '../../game/state/selectors';
import { effectiveCost } from '../../game/content/upgrades';
import { RESOURCE_INFO } from '../../game/content/resources';
import { audio } from '../../audio/audioManager';

/** The always-docked quick-buy rail: the next few buyable nodes so the tweak loop never breaks.
 *  The full branching graph lives in the Skill Tree overlay (opened from here / the topbar). */
export function QuickBuy({ onOpenTree }: { onOpenTree: () => void }) {
  // Reactive deps that change affordability/visibility; the helpers read the full snapshot.
  useGameStore((s) => s.resources);
  useGameStore((s) => s.upgrades);
  useGameStore((s) => s.discovered);
  useGameStore((s) => s.stats.maxDepth);
  const buy = useGameStore((s) => s.buyUpgrade);

  const s = useGameStore.getState();
  const candidates = visibleUpgrades(s)
    .filter((u) => {
      const lvl = s.upgrades[u.id] ?? 0;
      const maxed = u.max != null && lvl >= u.max;
      return !maxed && requiresMet(s, u);
    })
    .map((u) => ({ u, cost: effectiveCost(s, u), afford: canAfford(s, u) }))
    .sort((a, b) => {
      if (a.afford !== b.afford) return a.afford ? -1 : 1;
      return a.cost.lt(b.cost) ? -1 : a.cost.gt(b.cost) ? 1 : 0;
    })
    .slice(0, 6);

  return (
    <aside className="quickbuy" data-tour="shop">
      <div className="qb-head">
        <span className="qb-title">Upgrades</span>
        <button className="qb-tree-btn" onClick={onOpenTree} title="Open the full skill tree">
          ⌗ Tree
        </button>
      </div>
      {candidates.length === 0 && <div className="qb-empty">Collect to reveal upgrades…</div>}
      {candidates.map(({ u, cost, afford }) => {
        const lvl = s.upgrades[u.id] ?? 0;
        const info = RESOURCE_INFO[u.costResource];
        return (
          <button
            key={u.id}
            className={'qb-card' + (afford ? ' qb-afford' : '')}
            disabled={!afford}
            onClick={() => {
              audio.purchase();
              buy(u.id);
            }}
          >
            <div className="qb-card-top">
              <span className="qb-name">{u.name}</span>
              {u.max !== 1 && <span className="qb-lvl">Lv {lvl}</span>}
            </div>
            <div className="qb-desc">{u.description}</div>
            <div className="qb-cost" style={{ color: info.color }}>
              {info.icon} {fmt(cost)}
            </div>
          </button>
        );
      })}
    </aside>
  );
}
