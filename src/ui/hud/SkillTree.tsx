import { useGameStore } from '../../game/state/store';
import { fmt } from '../../game/math/bignum';
import { UPGRADES, UPGRADES_BY_ID, effectiveCost, type UpgradeBranch, type UpgradeDef } from '../../game/content/upgrades';
import { visibleUpgrades, canAfford, requiresMet } from '../../game/state/selectors';
import { RESOURCE_INFO } from '../../game/content/resources';
import { audio } from '../../audio/audioManager';

const COL = 210;
const ROW = 150;
const PAD = 70;
const NODE_W = 124;
const NODE_H = 104;

const BRANCHES: UpgradeBranch[] = ['Collection', 'Navigation', 'Signal', 'Automation', 'Insight', 'Resonance'];
const BRANCH_COLOR: Record<UpgradeBranch, string> = {
  Collection: 'var(--good)',
  Navigation: 'var(--accent)',
  Signal: 'var(--accent-2)',
  Automation: 'var(--warn)',
  Insight: 'var(--gold)',
  Resonance: 'var(--danger)',
};

const cx = (u: UpgradeDef) => PAD + u.pos.x * COL + NODE_W / 2;
const cy = (u: UpgradeDef) => PAD + u.pos.y * ROW + NODE_H / 2;

/** The shop: a pannable node-graph skill tree. Nodes unlock outward via `requires`; the docked
 *  QuickBuy rail mirrors the next affordable nodes so the moment-to-moment loop stays intact. */
export function SkillTree({ onClose }: { onClose: () => void }) {
  useGameStore((s) => s.resources);
  useGameStore((s) => s.upgrades);
  useGameStore((s) => s.discovered);
  useGameStore((s) => s.stats.maxDepth);
  const buy = useGameStore((s) => s.buyUpgrade);

  const s = useGameStore.getState();
  const visible = visibleUpgrades(s);
  const visIds = new Set(visible.map((u) => u.id));

  const maxX = Math.max(...UPGRADES.map((u) => u.pos.x));
  const maxY = Math.max(...UPGRADES.map((u) => u.pos.y));
  const width = PAD * 2 + maxX * COL + NODE_W;
  const height = PAD * 2 + maxY * ROW + NODE_H;

  const edges: { id: string; x1: number; y1: number; x2: number; y2: number; owned: boolean }[] = [];
  for (const u of visible) {
    for (const r of u.requires ?? []) {
      const p = UPGRADES_BY_ID[r];
      if (!p || !visIds.has(r)) continue;
      edges.push({
        id: `${r}->${u.id}`,
        x1: cx(p),
        y1: cy(p),
        x2: cx(u),
        y2: cy(u),
        owned: (s.upgrades[r] ?? 0) >= 1,
      });
    }
  }

  return (
    <div className="modal-overlay tree-overlay" onClick={onClose}>
      <div className="tree-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head tree-head">
          <h2>System Configuration</h2>
          <div className="tree-legend">
            {BRANCHES.map((b) => (
              <span key={b} className="tree-legend-item" style={{ color: BRANCH_COLOR[b] }}>
                ● {b}
              </span>
            ))}
          </div>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>

        <div className="tree-scroll">
          <div className="tree-canvas" style={{ width, height }}>
            <svg className="tree-edges" width={width} height={height}>
              {edges.map((e) => (
                <line
                  key={e.id}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  className={'tree-edge' + (e.owned ? ' tree-edge-on' : '')}
                />
              ))}
            </svg>

            {visible.map((u) => {
              const lvl = s.upgrades[u.id] ?? 0;
              const maxed = u.max != null && lvl >= u.max;
              const owned = lvl >= 1;
              const reqMet = requiresMet(s, u);
              const afford = canAfford(s, u);
              const cost = effectiveCost(s, u);
              const info = RESOURCE_INFO[u.costResource];
              const cls =
                'tree-node' +
                (maxed ? ' tree-maxed' : owned ? ' tree-owned' : afford ? ' tree-afford' : reqMet ? ' tree-ready' : ' tree-locked');
              return (
                <button
                  key={u.id}
                  className={cls}
                  style={{ left: PAD + u.pos.x * COL, top: PAD + u.pos.y * ROW, width: NODE_W, height: NODE_H, ['--bc' as string]: BRANCH_COLOR[u.branch] }}
                  disabled={!afford}
                  title={u.description}
                  onClick={() => {
                    audio.purchase();
                    buy(u.id);
                  }}
                >
                  <div className="tree-node-head">
                    <span className="tree-node-name">{u.name}</span>
                    <span className="tree-node-lvl">
                      {u.max === 1 ? (maxed ? 'OWNED' : '') : maxed ? 'MAX' : `${lvl}${u.max ? '/' + u.max : ''}`}
                    </span>
                  </div>
                  {!maxed && (
                    <span className="tree-node-cost" style={{ color: reqMet ? info.color : 'var(--muted)' }}>
                      {reqMet ? `${info.icon} ${fmt(cost)}` : '🔒 locked'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
