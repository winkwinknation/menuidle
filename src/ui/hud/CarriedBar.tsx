import { useGameStore } from '../../game/state/store';
import { fmt } from '../../game/math/bignum';
import { RESOURCE_KINDS, RESOURCE_INFO } from '../../game/content/resources';

/** Shows your unbanked haul while you're below the surface. Banked by climbing back. */
export function CarriedBar() {
  const carried = useGameStore((s) => s.carried);
  const depth = useGameStore((s) => s.nav.length - 1);
  if (depth <= 0) return null;
  const shown = RESOURCE_KINDS.filter((k) => carried[k].gt(0));
  if (shown.length === 0) return null;

  return (
    <div className="carried-bar">
      <span className="carried-label">🎒 Carrying</span>
      {shown.map((k) => {
        const info = RESOURCE_INFO[k];
        return (
          <span key={k} className="carried-item" style={{ color: info.color }}>
            {info.icon} {fmt(carried[k])}
          </span>
        );
      })}
      <span className="carried-hint">climb back to the surface to bank it</span>
    </div>
  );
}
