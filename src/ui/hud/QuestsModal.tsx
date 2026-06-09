import { useGameStore } from '../../game/state/store';
import { questProgress, rewardLabel } from '../../game/content/quests';
import { audio } from '../../audio/audioManager';

export function QuestsModal({ onClose }: { onClose: () => void }) {
  const quests = useGameStore((s) => s.quests);
  const claim = useGameStore((s) => s.claimQuest);
  // Reactive deps so progress bars update live.
  useGameStore((s) => s.stats.maxDepth);
  useGameStore((s) => s.stats.totalCollects);
  useGameStore((s) => s.keys);
  useGameStore((s) => s.combo.count);
  const s = useGameStore.getState();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>System Tasks</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>
        <p className="danger-text" style={{ color: 'var(--muted)' }}>
          Complete tasks for rewards. New tasks appear as you claim them.
        </p>

        <div className="quest-list">
          {quests.map((q) => {
            const prog = questProgress(s, q);
            const pct = Math.min(100, (prog / q.target) * 100);
            return (
              <div key={q.id} className={'quest' + (q.done ? ' quest-done' : '')}>
                <div className="quest-top">
                  <span className="quest-label">{q.label}</span>
                  <span className="quest-reward">{rewardLabel(q.reward)}</span>
                </div>
                <div className="quest-track">
                  <span className="quest-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="quest-foot">
                  <span className="quest-progress">
                    {q.done ? 'Complete' : `${Math.floor(prog)} / ${q.target}`}
                  </span>
                  <button
                    className="btn btn-claim"
                    disabled={!q.done}
                    onClick={() => {
                      audio.purchase();
                      claim(q.id);
                    }}
                  >
                    Claim
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
