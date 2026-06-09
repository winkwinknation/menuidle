import { useState } from 'react';
import { audio } from '../../audio/audioManager';
import type { MenuItem } from '../../game/generation/menuGenerator';

interface Props {
  items: MenuItem[];
  renderRow: (item: MenuItem) => React.ReactNode;
  sectionTitle: (i: number) => string;
}

function splitInto<T>(arr: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  arr.forEach((it, i) => out[i % n].push(it));
  return out;
}

/** Tabs menu: items spread across tabs you switch between. */
export function TabsMenu({ items, renderRow, sectionTitle }: Props) {
  const tabCount = Math.min(4, Math.max(2, Math.ceil(items.length / 4)));
  const tabs = splitInto(items, tabCount);
  const [active, setActive] = useState(0);

  return (
    <div className="tabs-menu">
      <div className="tab-bar">
        {tabs.map((_, ti) => (
          <button
            key={ti}
            className={'tab' + (ti === active ? ' tab-active' : '')}
            onClick={() => {
              audio.click();
              setActive(ti);
            }}
          >
            {sectionTitle(ti)}
          </button>
        ))}
      </div>
      <div className="tab-body">{(tabs[active] ?? []).map(renderRow)}</div>
    </div>
  );
}
