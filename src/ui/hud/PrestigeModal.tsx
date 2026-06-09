import { useState } from 'react';
import { useGameStore } from '../../game/state/store';
import { fmt } from '../../game/math/bignum';
import { cacheFor, MIN_REBOOT_DEPTH, PRESTIGE_UPGRADES } from '../../game/content/prestige';
import { audio } from '../../audio/audioManager';

export function PrestigeModal({ onClose }: { onClose: () => void }) {
  const cache = useGameStore((s) => s.cache);
  const prestigeUpgrades = useGameStore((s) => s.prestigeUpgrades);
  const runMaxDepth = useGameStore((s) => s.stats.runMaxDepth);
  const reboot = useGameStore((s) => s.reboot);
  const buyPrestige = useGameStore((s) => s.buyPrestige);

  const [confirm, setConfirm] = useState(false);

  const reward = cacheFor(runMaxDepth);
  const canReboot = reward.gt(0);

  const doReboot = () => {
    audio.reboot();
    reboot();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Reboot the System</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>

        <p className="danger-text">
          Wipe this run — resources, upgrades and your descent — and return to the Main Menu.
          You keep <strong>Cache</strong> and everything bought below. Any unbanked haul is lost.
        </p>

        <div className="prestige-reward">
          <div>
            <div className="prestige-cache">◈ {fmt(cache)} <span>Cache</span></div>
            <div className="prestige-sub">Deepest this run: Tier {runMaxDepth}</div>
          </div>
          {!confirm ? (
            <button className="btn btn-prestige" disabled={!canReboot} onClick={() => setConfirm(true)}>
              {canReboot ? <>Reboot for ◈ {fmt(reward)}</> : `Reach Tier ${MIN_REBOOT_DEPTH} to reboot`}
            </button>
          ) : (
            <div className="save-actions">
              <button className="btn btn-prestige" onClick={doReboot}>Confirm reboot</button>
              <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          )}
        </div>

        <hr className="modal-rule" />

        <h3 className="group-title">Permanent Upgrades</h3>
        <div className="prestige-list">
          {PRESTIGE_UPGRADES.map((u) => {
            const level = prestigeUpgrades[u.id] ?? 0;
            const maxed = u.max != null && level >= u.max;
            const cost = u.cost(level);
            const affordable = !maxed && cache.gte(cost);
            return (
              <button
                key={u.id}
                className={'upgrade' + (affordable ? ' upgrade-affordable' : '')}
                disabled={!affordable}
                onClick={() => {
                  audio.purchase();
                  buyPrestige(u.id);
                }}
              >
                <div className="upgrade-head">
                  <span className="upgrade-name">{u.name}</span>
                  <span className="upgrade-level">{u.max === 1 ? (maxed ? 'OWNED' : '') : `Lv ${level}`}</span>
                </div>
                <div className="upgrade-desc">{u.description}</div>
                <div className="upgrade-foot">
                  {maxed ? (
                    <span className="upgrade-max">MAX</span>
                  ) : (
                    <span className="upgrade-cost" style={{ color: 'var(--gold)' }}>◈ {fmt(cost)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
