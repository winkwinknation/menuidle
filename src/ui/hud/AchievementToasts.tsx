import { useEffect } from 'react';
import { useGameStore } from '../../game/state/store';

function Toast({ id, name, onDone }: { id: string; name: string; onDone: (id: string) => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => onDone(id), 5000);
    return () => window.clearTimeout(t);
  }, [id, onDone]);
  return (
    <div className="toast">
      <span className="toast-mark">★</span>
      <span className="toast-text">
        <span className="toast-title">Achievement Unlocked</span>
        <span className="toast-name">{name}</span>
      </span>
    </div>
  );
}

export function AchievementToasts() {
  const toasts = useGameStore((s) => s.achievementToasts);
  const dismiss = useGameStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <Toast key={t.id} id={t.id} name={t.name} onDone={dismiss} />
      ))}
    </div>
  );
}
