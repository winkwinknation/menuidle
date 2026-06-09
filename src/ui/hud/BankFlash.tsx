import { useEffect } from 'react';
import { useGameStore } from '../../game/state/store';
import { fmt, type Decimal } from '../../game/math/bignum';
import { RESOURCE_INFO, type ResourceKind } from '../../game/content/resources';
import { audio } from '../../audio/audioManager';
import { particles } from '../effects/particles';

/** The climb-and-bank payoff: a centred tally of what you just banked, with a burst + chime. */
export function BankFlash() {
  const bankFlash = useGameStore((s) => s.bankFlash);
  const dismiss = useGameStore((s) => s.dismissBankFlash);
  const id = bankFlash?.id;

  useEffect(() => {
    if (!bankFlash) return;
    audio.bank();
    particles.emit(window.innerWidth / 2, window.innerHeight * 0.3, '#ffd24a', 26);
    const t = window.setTimeout(() => dismiss(), 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!bankFlash) return null;
  const entries = Object.entries(bankFlash.amounts) as [ResourceKind, Decimal][];

  return (
    <div className="bank-flash" key={bankFlash.id}>
      <div className="bank-flash-title">BANKED</div>
      <div className="bank-flash-rows">
        {entries.map(([k, v]) => (
          <span key={k} className="bank-flash-row" style={{ color: RESOURCE_INFO[k].color }}>
            +{fmt(v)} {RESOURCE_INFO[k].icon}
          </span>
        ))}
      </div>
    </div>
  );
}
