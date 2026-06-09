import { useGameStore } from '../../game/state/store';
import { fmt } from '../../game/math/bignum';
import { derive } from '../../game/content/upgrades';
import { serviceRate, servicesByKind } from '../../game/systems/services';
import { RESOURCE_INFO, RESOURCE_KINDS } from '../../game/content/resources';

/** Manage the idle portfolio: every enabled Settings toggle keeps producing here, even while away. */
export function ServicesPanel({ onClose }: { onClose: () => void }) {
  const services = useGameStore((s) => s.services);
  const disableService = useGameStore((s) => s.disableService);
  const slots = useGameStore((s) => derive(s).serviceSlots);

  const s = useGameStore.getState();
  const byKind = servicesByKind(s);
  const active = RESOURCE_KINDS.filter((k) => byKind[k].gt(0));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Background Services</h2>
          <button className="btn btn-x" onClick={onClose}>✕</button>
        </div>

        <p className="danger-text">
          Settings toggles you enable keep producing while you explore — and while you're away.{' '}
          <strong>{services.length}/{slots}</strong> slots in use.
        </p>

        <div className="svc-totals">
          {active.length ? (
            active.map((k) => (
              <span key={k} className="svc-total" style={{ color: RESOURCE_INFO[k].color }}>
                {RESOURCE_INFO[k].icon} {fmt(byKind[k])}/s
              </span>
            ))
          ) : (
            <span className="danger-text" style={{ margin: 0 }}>
              Nothing running. Open a Settings menu and flip a toggle to enable a service.
            </span>
          )}
        </div>

        {services.length > 0 && (
          <div className="svc-list">
            {services.map((svc) => (
              <div key={svc.id} className="svc-row">
                <div className="svc-info">
                  <span className="svc-name">{svc.label}</span>
                  <span className="svc-sub" style={{ color: RESOURCE_INFO[svc.kind].color }}>
                    Tier {svc.tier} · {RESOURCE_INFO[svc.kind].icon} {fmt(serviceRate(s, svc))}/s
                  </span>
                </div>
                <button className="btn btn-x btn-danger" onClick={() => disableService(svc.id)}>
                  Stop
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
