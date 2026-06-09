import { useEffect, useState } from 'react';
import { useGameStore } from '../../game/state/store';
import { audio } from '../../audio/audioManager';
import { rewardLabel } from '../../game/content/quests';
import type { MenuItem, EncounterSpec } from '../../game/generation/menuGenerator';

interface Props {
  spec: EncounterSpec;
  items: MenuItem[];
  collected: boolean[];
  onResource: (e: React.MouseEvent, item: MenuItem) => void;
  label: (raw: string) => string;
  gain: (item: MenuItem) => string;
}

/** A gauntlet: collect everything before the timer; Back is gone until it resolves. */
export function EncounterMenu({ spec, items, collected, onResource, label, gain }: Props) {
  const resolve = useGameStore((s) => s.resolveEncounter);
  const escape = useGameStore((s) => s.escapeEncounter);
  const [timeLeft, setTimeLeft] = useState(spec.timeMs);
  const [state, setState] = useState<'none' | 'win' | 'lose'>('none');

  const total = items.length;
  const got = items.filter((it) => collected[it.index]).length;

  useEffect(() => {
    if (state !== 'none') return;
    const start = Date.now();
    const iv = window.setInterval(() => {
      const left = spec.timeMs - (Date.now() - start);
      if (left <= 0) {
        setTimeLeft(0);
        setState('lose');
        audio.error();
        window.clearInterval(iv);
      } else {
        setTimeLeft(left);
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [state, spec.timeMs]);

  useEffect(() => {
    if (state === 'none' && total > 0 && got >= total) {
      setState('win');
      resolve(spec.reward);
      audio.purchase();
    }
  }, [got, total, state, resolve, spec.reward]);

  const pct = Math.max(0, (timeLeft / spec.timeMs) * 100);
  const secs = Math.max(0, Math.ceil(timeLeft / 1000));

  return (
    <div className="encounter">
      <div className="encounter-head">
        <span className="encounter-tag">⚠ ENCOUNTER</span>
        <span className="encounter-obj">
          Collect all {total} before time runs out. There is no way back until it is done.
        </span>
      </div>
      <div className="encounter-timer">
        <span className="encounter-fill" style={{ width: `${pct}%` }} />
        <span className="encounter-secs">
          {got}/{total} · {secs}s
        </span>
      </div>

      <div className="menu-list encounter-items">
        {items.map((item) => {
          const done = collected[item.index];
          return (
            <button
              key={item.index}
              className={'item item-resource' + (done ? ' item-collected' : '')}
              disabled={done || state !== 'none'}
              onClick={(e) => onResource(e, item)}
            >
              <span className="item-label">{label(item.label)}</span>
              {done ? <span className="item-check">✓</span> : <span className="item-value">+{gain(item)}</span>}
            </button>
          );
        })}
      </div>

      {state === 'win' && (
        <div className="encounter-result encounter-win">
          <span>Cleared. Reward: {rewardLabel(spec.reward)}</span>
          <button className="btn" onClick={() => escape()}>Leave</button>
        </div>
      )}
      {state === 'lose' && (
        <div className="encounter-result encounter-lose">
          <span>It closed. You were too slow.</span>
          <button className="btn" onClick={() => escape()}>Back out</button>
        </div>
      )}
    </div>
  );
}
