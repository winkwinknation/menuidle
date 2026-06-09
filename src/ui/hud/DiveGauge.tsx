import type { CSSProperties } from 'react';
import { useGameStore } from '../../game/state/store';
import { derive } from '../../game/content/upgrades';
import type { LandmarkType } from '../../game/generation/menuGenerator';

const LM_GLYPH: Record<LandmarkType, string> = {
  vault: '◈',
  echo: '⟆',
  refusal: '⚠',
  anomaly: '⌖',
  bottom: '∎',
};

/** A slim left rail that gives the descent a sense of place: how deep you are, your Signal tether,
 *  and the landmarks along the current path. Derived from nav + signal — nothing extra is stored. */
export function DiveGauge() {
  const nav = useGameStore((s) => s.nav);
  const signal = useGameStore((s) => s.signal);
  const signalMax = useGameStore((s) => derive(s).signalMax);

  const depth = nav.length - 1;
  const frac = signalMax > 0 ? Math.max(0, Math.min(1, signal / signalMax)) : 0;
  const lost = depth > 0 && signal <= 0;
  const low = !lost && frac < 0.25;
  const sigColor = lost ? 'var(--danger)' : low ? 'var(--warn)' : 'var(--good)';

  // Only show the deepest stretch of the path so the ribbon never overflows.
  const start = Math.max(0, nav.length - 14);
  const shown = nav.slice(start);

  return (
    <aside className="dive-gauge" data-tour="dive">
      <div className="dive-head">DIVE</div>

      <div className="dive-depth">
        <span className="dive-tier">{depth}</span>
        <span className="dive-tier-label">tier</span>
      </div>

      <div className={'signal-meter' + (lost ? ' signal-lost' : low ? ' signal-low' : '')}>
        <div className="signal-track">
          <span className="signal-fill" style={{ background: sigColor, ['--sig' as string]: frac } as CSSProperties} />
        </div>
        <div className="signal-info">
          <span className="signal-pct" style={{ color: sigColor }}>{lost ? '!' : `${Math.round(frac * 100)}%`}</span>
          <span className="signal-label">Signal</span>
        </div>
      </div>

      <div className="dive-ribbon">
        {start > 0 && <div className="ribbon-more">⋮</div>}
        {shown.map((lvl, i) => {
          const idx = start + i;
          const lm = lvl.data.landmark;
          return (
            <div
              key={idx}
              className={
                'ribbon-node' +
                (idx === depth ? ' ribbon-cur' : '') +
                (idx === 0 ? ' ribbon-surface' : '') +
                (lm ? ' ribbon-landmark lm-' + lm : '')
              }
              title={idx === 0 ? 'Surface' : lm ? `Tier ${idx} · ${lm}` : `Tier ${idx}`}
            >
              <span className="ribbon-dot">{lm ? LM_GLYPH[lm] : idx === 0 ? '⌂' : '·'}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
