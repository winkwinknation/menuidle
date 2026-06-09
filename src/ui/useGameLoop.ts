import { useEffect } from 'react';
import { useGameStore } from '../game/state/store';

/** Fixed-ish RAF loop driving idle production (charge regen, combo decay, playtime). */
export function useGameLoop(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(t - last, 250); // clamp big gaps (tab unfocus)
      last = t;
      useGameStore.getState().tick(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
}
