// Background Services — the idle portfolio, and the strategy layer the game lacked.
// Enabling a Settings toggle (or installing a Grid tile) turns that menu node into a PERSISTENT
// generator that produces its resource forever, independent of the menu tree (menus aren't stored;
// a Service is a small saved record keyed by path+index). Slots are capped + upgradable, so *which*
// menus you keep running is a real decision. Income is summed in store.tick() and on offline load,
// mirroring crawlerRate() in automation.ts.
import { Decimal, D } from '../math/bignum';
import { derive } from '../content/upgrades';
import { RESOURCE_KINDS, type ResourceKind } from '../content/resources';
import type { GameState } from '../state/types';

export interface Service {
  id: string; // stable key: path.join('.') + ':' + index
  path: number[];
  index: number;
  kind: ResourceKind;
  tier: number; // depth where enabled — drives the base rate
  theme: string;
  label: string;
}

/** Base resource/sec for a service, before global multipliers. Gentler than active descent value
 *  so idle income trails (but supports) hands-on play (Balanced playstyle). */
export const SERVICE_BASE = 0.22;
export const SERVICE_GROWTH = 1.1;

export function serviceId(path: number[], index: number): string {
  return path.join('.') + ':' + index;
}

export function serviceBaseRate(tier: number): Decimal {
  return D(SERVICE_BASE).mul(Decimal.pow(SERVICE_GROWTH, tier));
}

/** One service's production in units/sec, including global collection + service multipliers. */
export function serviceRate(s: GameState, svc: Service): Decimal {
  const eff = derive(s);
  return serviceBaseRate(svc.tier).mul(eff.collectMult).mul(eff.serviceMult);
}

/** Total background production grouped by resource kind (units/sec). */
export function servicesByKind(s: GameState): Record<ResourceKind, Decimal> {
  const out = Object.fromEntries(RESOURCE_KINDS.map((k) => [k, D(0)])) as Record<ResourceKind, Decimal>;
  if (!s.services.length) return out;
  const eff = derive(s);
  const factor = eff.collectMult.mul(eff.serviceMult);
  for (const svc of s.services) out[svc.kind] = out[svc.kind].add(serviceBaseRate(svc.tier).mul(factor));
  return out;
}

/** Max concurrent services. */
export function serviceSlots(s: GameState): number {
  return derive(s).serviceSlots;
}

export function isServiceOn(s: GameState, path: number[], index: number): boolean {
  const id = serviceId(path, index);
  return s.services.some((svc) => svc.id === id);
}
