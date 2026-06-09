import { useState, useCallback } from 'react';
import { useGameStore } from '../../game/state/store';
import { Decimal, fmt } from '../../game/math/bignum';
import { breadcrumbNames } from '../../game/state/selectors';
import { resourceForMenuType, RESOURCE_INFO } from '../../game/content/resources';
import { collectMultiplier, derive } from '../../game/content/upgrades';
import { serviceId } from '../../game/systems/services';
import { corruptLabel, isWatcher } from '../../game/generation/dread';
import { getTheme } from '../../game/generation/themes';
import { audio } from '../../audio/audioManager';
import { particles } from '../effects/particles';
import { shake } from '../effects/shake';
import { ReturnControls } from './ReturnControls';
import { DropdownMenu } from './DropdownMenu';
import { TabsMenu } from './TabsMenu';
import { EncounterMenu } from './EncounterMenu';
import type { MenuItem } from '../../game/generation/menuGenerator';

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

let popupId = 0;

const TYPE_LABEL: Record<string, string> = {
  list: 'List',
  settings: 'Settings',
  grid: 'Grid',
  dropdown: 'Dropdown',
  tabs: 'Tabs',
};

const LANDMARK_LABEL: Record<string, string> = {
  vault: '◈ Vault',
  echo: '⟆ Echo',
  refusal: '⚠ The Refusal',
  anomaly: '⌖ Anomaly',
  bottom: '∎ The Bottom',
};

export function MenuView() {
  const nav = useGameStore((s) => s.nav);
  const enter = useGameStore((s) => s.enter);
  const collect = useGameStore((s) => s.collect);
  const intensity = useGameStore((s) => s.settings.horrorIntensity);
  const keys = useGameStore((s) => s.keys);
  const clearedEncounters = useGameStore((s) => s.clearedEncounters);
  const upgrades = useGameStore((s) => s.upgrades);
  const prestigeUpgrades = useGameStore((s) => s.prestigeUpgrades);
  const collectMult = collectMultiplier(upgrades, prestigeUpgrades);
  const services = useGameStore((s) => s.services);
  const enableService = useGameStore((s) => s.enableService);
  const disableService = useGameStore((s) => s.disableService);
  const serviceSlotsMax = useGameStore((s) => derive(s).serviceSlots);

  const [popups, setPopups] = useState<Popup[]>([]);

  const level = nav[nav.length - 1];
  const names = breadcrumbNames(nav);
  const depth = nav.length - 1;
  const title = corruptLabel(names[depth], depth, intensity);
  const parentName = corruptLabel(depth > 0 ? names[depth - 1] : 'Main Menu', depth, intensity);
  const menuType = level.data.menuType;
  const resource = resourceForMenuType(menuType);
  const resInfo = RESOURCE_INFO[resource];

  const label = (raw: string) => corruptLabel(raw, depth, intensity);

  const themeEntries = getTheme(level.data.theme).entries;
  const sectionTitle = (i: number) =>
    label(themeEntries.length ? themeEntries[i % themeEntries.length] : `Section ${i + 1}`);

  // A beaten encounter's entry vanishes (and won't regenerate as a gauntlet).
  const isClearedEncounter = (item: MenuItem) =>
    Boolean(item.childEncounter) && clearedEncounters.includes([...level.data.path, item.index].join('.'));

  const spawnPopup = useCallback((x: number, y: number, text: string, color: string) => {
    const id = ++popupId;
    setPopups((p) => [...p, { id, x, y, text, color }]);
    window.setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 850);
  }, []);

  const goEnter = (item: MenuItem) => {
    const locked = Boolean(item.locked) && !level.collected[item.index];
    if (locked && keys <= 0) {
      audio.error();
      return;
    }
    audio.click();
    enter(item.index);
    // A stinger if we just stepped into a landmark (the child is now the current level).
    if (useGameStore.getState().nav[useGameStore.getState().nav.length - 1].data.landmark) audio.landmark();
  };

  const onToggleService = (item: MenuItem) => {
    const id = serviceId(level.data.path, item.index);
    if (services.some((x) => x.id === id)) {
      disableService(id);
      audio.back();
      return;
    }
    const before = services.length;
    enableService(item.index);
    if (useGameStore.getState().services.length > before) audio.purchase();
    else audio.error(); // no free service slot
  };

  const onResource = (e: React.MouseEvent, item: MenuItem) => {
    const g = collect(item.index);
    if (g === null) return;
    if (item.isKey) {
      spawnPopup(e.clientX, e.clientY, '+🔑', 'var(--gold)');
      particles.emit(e.clientX, e.clientY, '#ffd24a', 12);
      audio.purchase();
      return;
    }
    if (item.signalBoost) {
      spawnPopup(e.clientX, e.clientY, '+📶', 'var(--accent-2)');
      particles.emit(e.clientX, e.clientY, '#8a6bff', 14);
      audio.purchase();
      return;
    }
    if (item.harvestKind) {
      const hi = RESOURCE_INFO[item.harvestKind];
      spawnPopup(e.clientX, e.clientY, `+${fmt(g)} ${hi.icon}`, hi.color);
      particles.emit(e.clientX, e.clientY, hi.hex, 10);
      audio.collect(0);
      return;
    }
    spawnPopup(e.clientX, e.clientY, '+' + fmt(g), resInfo.color);
    const combo = useGameStore.getState().combo.count;
    particles.emit(e.clientX, e.clientY, resInfo.hex, Math.min(6 + combo * 2, 40));
    audio.collect(combo);
    if (combo >= 12) shake(Math.min(2 + combo * 0.15, 7));
  };

  const gain = (item: MenuItem) => fmt((item.value ?? new Decimal(0)).mul(collectMult));

  // A renewable node, once harvested, greys out only until its cooldown elapses; show the refill.
  const renewBar = (item: MenuItem) => {
    const ready = level.cooldowns[item.index] ?? 0;
    const remaining = ready - Date.now();
    if (remaining <= 0) return <span className="item-check">✓</span>;
    return (
      <span className="renew-bar" title="refilling…">
        <span className="renew-fill" style={{ animationDuration: `${remaining}ms` }} />
      </span>
    );
  };

  const renderRow = (item: MenuItem) => {
    const collected = level.collected[item.index];
    const watch = isWatcher(item.label, depth, item.index, intensity) ? ' item-watch' : '';
    if (item.kind === 'submenu') {
      if (isClearedEncounter(item)) return null;
      const locked = Boolean(item.locked) && !collected;
      return (
        <button
          key={item.index}
          className={'item item-submenu' + watch + (locked ? ' item-locked' : '')}
          onClick={() => goEnter(item)}
        >
          <span className="item-label">{label(item.label)}</span>
          {locked ? <span className="item-lock">🔒 1 🔑</span> : <span className="item-chevron">›</span>}
        </button>
      );
    }

    // Settings toggles are switches for persistent Background Services, not one-shot collects.
    if (menuType === 'settings' && item.installable) {
      const on = services.some((x) => x.id === serviceId(level.data.path, item.index));
      return (
        <button
          key={item.index}
          className={'item item-setting item-service' + (on ? ' item-service-on' : '') + watch}
          onClick={() => onToggleService(item)}
          title={on ? 'Stop this background service' : 'Run this in the background'}
        >
          <span className="item-label">{label(item.label)}</span>
          <span className="service-meta">
            <span className="service-tag">{on ? 'running' : 'enable'}</span>
            <span className={'toggle' + (on ? ' toggle-on' : '')}>
              <span className="toggle-knob" />
            </span>
          </span>
        </button>
      );
    }

    const renewing = collected && Boolean(item.renewable);
    return (
      <button
        key={item.index}
        className={
          'item item-resource' + (collected ? ' item-collected' : '') + (renewing ? ' item-renewing' : '') + watch
        }
        disabled={collected}
        onClick={(e) => onResource(e, item)}
      >
        <span className="item-label">{label(item.label)}</span>
        {collected ? (
          renewing ? renewBar(item) : <span className="item-check">✓</span>
        ) : item.isKey ? (
          <span className="item-value" style={{ color: 'var(--gold)' }}>+🔑 Key</span>
        ) : item.signalBoost ? (
          <span className="item-value" style={{ color: 'var(--accent-2)' }}>+📶 Signal</span>
        ) : item.harvestKind ? (
          <span className="item-value item-harvest" style={{ color: RESOURCE_INFO[item.harvestKind].color }}>
            +{gain(item)} {RESOURCE_INFO[item.harvestKind].icon}
          </span>
        ) : (
          <span className="item-value" style={{ color: resInfo.color }}>
            {item.renewable && <span className="renew-dot" title="renewable">♻ </span>}+{gain(item)}
          </span>
        )}
      </button>
    );
  };

  const renderTile = (item: MenuItem) => {
    const collected = level.collected[item.index];
    const watch = isWatcher(item.label, depth, item.index, intensity) ? ' tile-watch' : '';
    if (item.kind === 'submenu') {
      if (isClearedEncounter(item)) return null;
      const locked = Boolean(item.locked) && !collected;
      return (
        <button
          key={item.index}
          className={'tile tile-submenu' + watch + (locked ? ' item-locked' : '')}
          onClick={() => goEnter(item)}
        >
          <span className="tile-icon">{locked ? '🔒' : '▤'}</span>
          <span className="tile-label">{label(item.label)}</span>
        </button>
      );
    }
    const renewing = collected && Boolean(item.renewable);
    return (
      <button
        key={item.index}
        className={
          'tile tile-resource' + (collected ? ' tile-collected' : '') + (renewing ? ' tile-renewing' : '') + watch
        }
        disabled={collected}
        onClick={(e) => onResource(e, item)}
      >
        <span className="tile-icon">
          {collected
            ? renewing
              ? '♻'
              : '✓'
            : item.isKey
              ? '🔑'
              : item.signalBoost
                ? '📶'
                : item.harvestKind
                  ? RESOURCE_INFO[item.harvestKind].icon
                  : '◆'}
        </span>
        <span className="tile-label">{label(item.label)}</span>
        {collected
          ? renewing && (
              <span className="renew-bar" title="refilling…">
                <span className="renew-fill" style={{ animationDuration: `${(level.cooldowns[item.index] ?? 0) - Date.now()}ms` }} />
              </span>
            )
          : item.isKey ? (
              <span className="tile-value" style={{ color: 'var(--gold)' }}>+🔑</span>
            ) : item.signalBoost ? (
              <span className="tile-value" style={{ color: 'var(--accent-2)' }}>+📶</span>
            ) : item.harvestKind ? (
              <span className="tile-value item-harvest" style={{ color: RESOURCE_INFO[item.harvestKind].color }}>
                +{gain(item)}
              </span>
            ) : (
              <span className="tile-value" style={{ color: resInfo.color }}>+{gain(item)}</span>
            )}
      </button>
    );
  };

  return (
    <section className="menu-window" data-tour="menu">
      <div className="window-bar">
        <div className="window-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="window-title">{title}</div>
        {services.length > 0 && (
          <div className="window-services" title="Background services running / slots">
            ⚙ {services.length}/{serviceSlotsMax}
          </div>
        )}
        {level.data.landmark && (
          <div className={'window-landmark lm-' + level.data.landmark}>{LANDMARK_LABEL[level.data.landmark]}</div>
        )}
        <div className="window-type">{TYPE_LABEL[menuType] ?? menuType}</div>
      </div>

      <div className="window-body" key={level.data.path.join('.')}>
        {level.data.encounter ? (
          <EncounterMenu
            spec={level.data.encounter}
            items={level.data.items}
            collected={level.collected}
            onResource={onResource}
            label={label}
            gain={gain}
          />
        ) : (
          <>
            <div className="return-row">
              <ReturnControls depth={depth} parentName={parentName} />
            </div>
            {menuType === 'grid' ? (
              <div className="menu-grid">{level.data.items.map(renderTile)}</div>
            ) : menuType === 'dropdown' ? (
              <DropdownMenu items={level.data.items} renderRow={renderRow} sectionTitle={sectionTitle} />
            ) : menuType === 'tabs' ? (
              <TabsMenu items={level.data.items} renderRow={renderRow} sectionTitle={sectionTitle} />
            ) : (
              <div className="menu-list">{level.data.items.map(renderRow)}</div>
            )}
          </>
        )}
      </div>

      <div className="popup-layer">
        {popups.map((p) => (
          <span key={p.id} className="popup" style={{ left: p.x, top: p.y, color: p.color }}>
            {p.text}
          </span>
        ))}
      </div>
    </section>
  );
}
