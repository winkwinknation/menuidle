// Lightweight screen shake via the Web Animations API — no CSS, no state.
export function shake(px = 5, durationMs = 180): void {
  const el = document.querySelector('.app') as HTMLElement | null;
  if (!el || typeof el.animate !== 'function') return;
  el.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: `translate(${px}px, ${-px}px)` },
      { transform: `translate(${-px}px, ${px}px)` },
      { transform: `translate(${px * 0.5}px, 0)` },
      { transform: 'translate(0,0)' },
    ],
    { duration: durationMs, easing: 'ease-in-out' },
  );
}
