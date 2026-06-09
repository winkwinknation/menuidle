import { useState } from 'react';
import { audio } from '../../audio/audioManager';
import type { MenuItem } from '../../game/generation/menuGenerator';

interface Props {
  items: MenuItem[];
  renderRow: (item: MenuItem) => React.ReactNode;
  sectionTitle: (i: number) => string;
}

const GROUP_SIZE = 4;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Dropdown menu: items hidden inside collapsibles you reveal — the source of Tokens. */
export function DropdownMenu({ items, renderRow, sectionTitle }: Props) {
  const groups = chunk(items, GROUP_SIZE);
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  const toggle = (gi: number) => {
    audio.click();
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(gi)) n.delete(gi);
      else n.add(gi);
      return n;
    });
  };

  return (
    <div className="dropdown-menu">
      {groups.map((g, gi) => {
        const isOpen = open.has(gi);
        return (
          <div className={'dd-group' + (isOpen ? ' dd-open' : '')} key={gi}>
            <button className="dd-header" onClick={() => toggle(gi)}>
              <span className="dd-caret">{isOpen ? '▾' : '▸'}</span>
              <span className="dd-title">{sectionTitle(gi)}</span>
              <span className="dd-count">{g.length}</span>
            </button>
            {isOpen && <div className="dd-body">{g.map(renderRow)}</div>}
          </div>
        );
      })}
    </div>
  );
}
