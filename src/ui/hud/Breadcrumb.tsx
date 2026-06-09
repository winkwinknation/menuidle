import { useGameStore } from '../../game/state/store';
import { breadcrumbNames } from '../../game/state/selectors';
import { corruptLabel, effectiveBand } from '../../game/generation/dread';

const MAX_VISIBLE = 5;

export function Breadcrumb() {
  const nav = useGameStore((s) => s.nav);
  const intensity = useGameStore((s) => s.settings.horrorIntensity);
  const raw = breadcrumbNames(nav);
  const depth = raw.length - 1;
  const band = effectiveBand(depth, intensity);
  // The path back rots: at high dread, the middle of the trail is erased — you forget.
  const names = raw.map((n, i) =>
    band >= 4 && i > 0 && i < depth - 3 ? '▚▚▚' : corruptLabel(n, depth, intensity),
  );

  // Collapse the middle when the trail gets long.
  let shown = names.map((n, i) => ({ n, i }));
  let collapsed = false;
  if (names.length > MAX_VISIBLE) {
    collapsed = true;
    shown = [{ n: names[0], i: 0 }, ...names.slice(-3).map((n, k) => ({ n, i: names.length - 3 + k }))];
  }

  return (
    <div className="breadcrumb">
      {shown.map((seg, idx) => (
        <span key={seg.i} className="crumb-wrap">
          {idx === 1 && collapsed && <span className="crumb-sep">/ … /</span>}
          {idx > 0 && !(idx === 1 && collapsed) && <span className="crumb-sep">/</span>}
          <span className={'crumb' + (seg.i === names.length - 1 ? ' crumb-current' : '')}>
            {seg.n}
          </span>
        </span>
      ))}
      <span className="depth-badge">Tier {depth}</span>
    </div>
  );
}
