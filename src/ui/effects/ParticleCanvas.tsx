import { useEffect, useRef } from 'react';
import { particles } from './particles';

export function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) particles.attach(ref.current);
    return () => particles.detach();
  }, []);
  return <canvas ref={ref} className="particle-canvas" />;
}
