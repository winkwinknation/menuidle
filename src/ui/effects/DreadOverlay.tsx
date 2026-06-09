import { useGameStore } from '../../game/state/store';
import { effectiveBand } from '../../game/generation/dread';

/** Full-screen, pointer-through visual grading that intensifies with the dread band.
 *  Static per band (no fast flashing) — photosensitivity-safe. */
export function DreadOverlay() {
  const depth = useGameStore((s) => s.nav.length - 1);
  const intensity = useGameStore((s) => s.settings.horrorIntensity);
  const band = effectiveBand(depth, intensity);
  if (band <= 0) return null;

  const t = band / 6;
  return (
    <div className="dread-layer" aria-hidden>
      <div className="dread-vignette" style={{ opacity: 0.18 + 0.62 * t }} />
      <div
        className="dread-tint"
        style={{
          opacity: 0.04 + 0.22 * t,
          background:
            band >= 4
              ? 'radial-gradient(circle at 50% 45%, rgba(120,0,20,0.0), rgba(80,0,15,0.9))'
              : 'radial-gradient(circle at 50% 45%, rgba(40,0,60,0.0), rgba(20,0,30,0.8))',
        }}
      />
      {band >= 5 && <div className="dread-scan" style={{ opacity: 0.05 + 0.08 * t }} />}
    </div>
  );
}
