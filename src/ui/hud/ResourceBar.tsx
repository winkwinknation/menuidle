import { useGameStore } from '../../game/state/store';
import { fmt } from '../../game/math/bignum';
import { currentComboMult } from '../../game/state/selectors';
import { RESOURCE_KINDS, RESOURCE_INFO } from '../../game/content/resources';
import { crawlerRate } from '../../game/systems/automation';

export function ResourceBar() {
  const resources = useGameStore((s) => s.resources);
  const discovered = useGameStore((s) => s.discovered);
  const keys = useGameStore((s) => s.keys);
  const surgeUntil = useGameStore((s) => s.surgeUntil);
  const wardUntil = useGameStore((s) => s.wardUntil);
  useGameStore((s) => s.upgrades); // re-render when crawlers change
  const comboCount = useGameStore((s) => s.combo.count);
  const mult = useGameStore(currentComboMult);
  const now = Date.now();

  const rate = crawlerRate(useGameStore.getState());

  // Clicks always shows; others appear once discovered (progressive disclosure).
  const shown = RESOURCE_KINDS.filter((k) => k === 'clicks' || discovered[k]);

  return (
    <div className="resource-bar" data-tour="resources">
      {shown.map((k) => {
        const info = RESOURCE_INFO[k];
        return (
          <div className={'resource' + (info.horror ? ' resource-horror' : '')} key={k}>
            <span className="resource-icon" style={{ color: info.color }}>{info.icon}</span>
            <span className="resource-value">{fmt(resources[k])}</span>
            <span className="resource-name">{info.name}</span>
            {k === 'clicks' && rate.gt(0) && <span className="resource-rate">+{fmt(rate)}/s</span>}
          </div>
        );
      })}
      {keys > 0 && (
        <div className="resource">
          <span className="resource-icon" style={{ color: 'var(--gold)' }}>🔑</span>
          <span className="resource-value">{keys}</span>
          <span className="resource-name">Keys</span>
        </div>
      )}
      {surgeUntil > now && <div className="buff buff-surge">⚡ Surge</div>}
      {wardUntil > now && <div className="buff buff-ward">🛡 Ward</div>}
      {comboCount > 1 && (
        <div className="combo" key={comboCount}>
          <span className="combo-mult">×{mult.toFixed(1)}</span>
          <span className="combo-count">{comboCount} combo</span>
        </div>
      )}
    </div>
  );
}
