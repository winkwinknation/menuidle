import { useGameStore } from '../../game/state/store';
import { derive } from '../../game/content/upgrades';
import { RESOURCE_KINDS } from '../../game/content/resources';
import { audio } from '../../audio/audioManager';

/**
 * The Back control rendered AS a menu entry (top of the menu) so it sits in the
 * player's natural click-path, with Return charges shown inline. Kept as its own
 * component so per-frame regen updates don't re-render the whole menu list.
 * There is no "Home" — returning to the top is climbing-only until prestige.
 */
export function ReturnControls({ depth, parentName }: { depth: number; parentName: string }) {
  const charges = useGameStore((s) => s.returnCharges);
  const regenProgress = useGameStore((s) => s.regenProgress);
  const maxCharges = useGameStore((s) => derive(s).maxCharges);
  const reach = useGameStore((s) => derive(s).reach);
  const back = useGameStore((s) => s.back);
  const hasHaul = useGameStore((s) => RESOURCE_KINDS.some((k) => s.carried[k].gt(0)));

  if (depth <= 0) return null;

  const canBack = charges > 0;
  const climb = Math.min(reach, depth);

  return (
    <button
      className={'item item-back' + (canBack ? '' : ' item-back-empty')}
      disabled={!canBack}
      onClick={() => {
        audio.back();
        back();
      }}
    >
      <span className="back-text">
        <span className="back-title">
          <span className="back-arrow">◀</span> Back
          {climb > 1 && <span className="back-reach">↑{climb} tiers</span>}
        </span>
        <span className="back-sub">
          {canBack ? `to ${parentName}${hasHaul ? ' · banks your haul' : ''}` : 'recharging…'}
        </span>
      </span>
      <span className="back-charges">
        <span className="charges-inline" title={`${charges} / ${maxCharges} return charges`}>
          {Array.from({ length: maxCharges }).map((_, i) => (
            <span key={i} className={'pip' + (i < charges ? ' pip-full' : '')} />
          ))}
        </span>
        {charges < maxCharges && (
          <span className="regen-track">
            <span className="regen-fill" style={{ width: `${regenProgress * 100}%` }} />
          </span>
        )}
      </span>
    </button>
  );
}
