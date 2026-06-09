import { useState } from 'react';
import { useGameStore } from '../../game/state/store';
import { THEMES } from '../../game/content/skins';

function formatPlaytime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const volume = useGameStore((s) => s.settings.masterVolume);
  const intensity = useGameStore((s) => s.settings.horrorIntensity);
  const personalDread = useGameStore((s) => s.settings.personalDread);
  const theme = useGameStore((s) => s.settings.theme);
  const playtime = useGameStore((s) => s.stats.playtimeMs);
  const resetSave = useGameStore((s) => s.resetSave);
  const exportSave = useGameStore((s) => s.exportSave);
  const importSave = useGameStore((s) => s.importSave);

  const [confirmReset, setConfirmReset] = useState(false);
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  const onExport = async () => {
    const code = exportSave();
    setExported(code);
    try {
      await navigator.clipboard.writeText(code);
      setImportMsg('Save copied to clipboard.');
    } catch {
      /* clipboard may be unavailable; the textarea still shows it */
    }
  };

  const onImport = () => {
    const ok = importSave(importText);
    setImportMsg(ok ? 'Save imported.' : 'Invalid save code.');
  };

  const onReset = async () => {
    await resetSave();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>

        <div className="setting-row">
          <label>Master Volume</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) =>
              useGameStore.setState((st) => ({
                settings: { ...st.settings, masterVolume: Number(e.target.value) },
              }))
            }
          />
          <span className="setting-value">{Math.round(volume * 100)}%</span>
        </div>

        <div className="setting-row">
          <label>Horror Intensity</label>
          <div className="intensity-buttons">
            {(['off', 'mild', 'full'] as const).map((id) => (
              <button
                key={id}
                className={'btn intensity-btn' + (intensity === id ? ' intensity-on' : '')}
                onClick={() =>
                  useGameStore.setState((st) => ({ settings: { ...st.settings, horrorIntensity: id } }))
                }
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <label>Personal Dread</label>
          <button
            className={'btn intensity-btn' + (personalDread ? ' intensity-on' : '')}
            onClick={() =>
              useGameStore.setState((st) => ({ settings: { ...st.settings, personalDread: !st.settings.personalDread } }))
            }
          >
            {personalDread ? 'On' : 'Off'}
          </button>
          <span className="setting-value" style={{ fontSize: '11px' }}>Full only</span>
        </div>

        <div className="setting-row">
          <label>Theme</label>
          <div className="intensity-buttons">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={'btn intensity-btn' + (theme === t.id ? ' intensity-on' : '')}
                onClick={() =>
                  useGameStore.setState((st) => ({ settings: { ...st.settings, theme: t.id } }))
                }
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row">
          <label>Playtime</label>
          <span className="setting-value">{formatPlaytime(playtime)}</span>
        </div>

        <hr className="modal-rule" />

        <div className="setting-block">
          <label>Export / Import Save</label>
          <div className="save-actions">
            <button className="btn" onClick={onExport}>Export to clipboard</button>
          </div>
          {exported && <textarea className="save-code" readOnly value={exported} rows={3} />}
          <textarea
            className="save-code"
            placeholder="Paste a save code here…"
            value={importText}
            rows={3}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="save-actions">
            <button className="btn" disabled={!importText.trim()} onClick={onImport}>Import</button>
          </div>
          {importMsg && <div className="save-msg">{importMsg}</div>}
        </div>

        <hr className="modal-rule" />

        <div className="setting-block danger-zone">
          <label>Reset Save</label>
          <p className="danger-text">Wipes all progress and starts a fresh world. This cannot be undone.</p>
          {!confirmReset ? (
            <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reset Save…</button>
          ) : (
            <div className="save-actions">
              <button className="btn btn-danger" onClick={onReset}>Yes, erase everything</button>
              <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
