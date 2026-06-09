import { useGameStore } from '../../game/state/store';

/** Two ominous meters: Interference (Dread — powers Resonance, invites worse) and Replacement
 *  (how complete the OWNER's copy of you is). Mechanical at every intensity; only the naming softens
 *  when horror is turned down, so balance never changes (parity). */
export function DreadMeter() {
  const dread = useGameStore((s) => s.dread);
  const replacement = useGameStore((s) => s.replacement);
  const maxDepth = useGameStore((s) => s.stats.maxDepth);
  const intensity = useGameStore((s) => s.settings.horrorIntensity);

  const showDread = dread > 0.5 || maxDepth >= 6;
  if (!showDread && replacement <= 0) return null;

  const off = intensity === 'off';
  const high = dread >= 60;

  return (
    <div className={'dread-hud' + (high ? ' dread-hud-high' : '')} data-tour="dread">
      {showDread && (
        <div className="dread-row">
          <span className="dread-name">{off ? 'Load' : 'Interference'}</span>
          <span className="dread-bar">
            <span className="dread-fill" style={{ width: `${dread}%` }} />
          </span>
          <span className="dread-val">{Math.round(dread)}</span>
        </div>
      )}
      {replacement > 0 && (
        <div className="dread-row">
          <span className="dread-name">{off ? 'Sync' : 'Replacement'}</span>
          <span className="dread-bar">
            <span className="rep-fill" style={{ width: `${replacement}%` }} />
          </span>
          <span className="dread-val">{Math.round(replacement)}%</span>
        </div>
      )}
    </div>
  );
}
