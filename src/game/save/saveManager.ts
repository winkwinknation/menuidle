// Persistence I/O only (strings in/out). Uses the Electron bridge when present,
// otherwise falls back to localStorage for pure-browser dev.
const LS_KEY = 'menu-idle-save';

interface MenuIdleBridge {
  isElectron: boolean;
  save: (json: string) => Promise<{ ok: boolean; error?: string }>;
  load: () => Promise<{ ok: boolean; data?: string | null; fromBackup?: boolean; error?: string }>;
  clear: () => Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    menuIdle?: MenuIdleBridge;
  }
}

const bridge = (): MenuIdleBridge | undefined =>
  typeof window !== 'undefined' ? window.menuIdle : undefined;

export async function persist(json: string): Promise<boolean> {
  const b = bridge();
  if (b) {
    const res = await b.save(json);
    return res.ok;
  }
  try {
    localStorage.setItem(LS_KEY, json);
    return true;
  } catch {
    return false;
  }
}

export async function loadRaw(): Promise<string | null> {
  const b = bridge();
  if (b) {
    const res = await b.load();
    return res.ok ? res.data ?? null : null;
  }
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

export async function clearRaw(): Promise<boolean> {
  const b = bridge();
  if (b) {
    const res = await b.clear();
    return res.ok;
  }
  try {
    localStorage.removeItem(LS_KEY);
    return true;
  } catch {
    return false;
  }
}
