// Resources. The base four are tied to menu types; the dark five are HARVESTED from the deep
// (flagged on items by the generator) and unlock band by band as you descend. They all carry & bank
// the same way, so the existing economy plumbing handles them generically.
import type { MenuType } from '../generation/menuGenerator';

export type ResourceKind =
  | 'clicks'
  | 'data'
  | 'packets'
  | 'tokens'
  | 'static'
  | 'sigils'
  | 'viscera'
  | 'names'
  | 'marrow';

export const BASE_RESOURCE_KINDS: ResourceKind[] = ['clicks', 'data', 'packets', 'tokens'];
export const HORROR_RESOURCE_KINDS: ResourceKind[] = ['static', 'sigils', 'viscera', 'names', 'marrow'];
export const RESOURCE_KINDS: ResourceKind[] = [...BASE_RESOURCE_KINDS, ...HORROR_RESOURCE_KINDS];

export interface ResourceInfo {
  name: string;
  icon: string;
  color: string; // CSS var, for text/UI
  hex: string; // concrete color, for the particle canvas
  horror?: boolean;
}

export const RESOURCE_INFO: Record<ResourceKind, ResourceInfo> = {
  clicks: { name: 'Clicks', icon: '◆', color: 'var(--good)', hex: '#49d49d' },
  data: { name: 'Data', icon: '▦', color: 'var(--accent)', hex: '#5b8cff' },
  packets: { name: 'Packets', icon: '⬡', color: 'var(--accent-2)', hex: '#8a6bff' },
  tokens: { name: 'Tokens', icon: '⬢', color: 'var(--warn)', hex: '#ffb454' },
  static: { name: 'Static', icon: '▒', color: 'var(--static)', hex: '#b9c0d4', horror: true },
  sigils: { name: 'Sigils', icon: '⛧', color: 'var(--sigil)', hex: '#c08bff', horror: true },
  viscera: { name: 'Viscera', icon: '🜄', color: 'var(--viscera)', hex: '#c2384a', horror: true },
  names: { name: 'Names', icon: '𝄃', color: 'var(--names)', hex: '#d8cdb6', horror: true },
  marrow: { name: 'Marrow', icon: '☓', color: 'var(--marrow)', hex: '#e7dca0', horror: true },
};

/** The dread band at which each dark resource becomes harvestable (and shows in the HUD). */
export const HORROR_UNLOCK_BAND: Record<string, number> = {
  static: 1,
  sigils: 2,
  viscera: 3,
  names: 4,
  marrow: 5,
};

/** Which resource a menu yields, by its type (base economy only — horror is harvested per-item). */
export function resourceForMenuType(t: MenuType): ResourceKind {
  if (t === 'settings') return 'data';
  if (t === 'grid') return 'packets';
  if (t === 'dropdown') return 'tokens';
  return 'clicks';
}
