// Big-number wrapper (decided up front per the plan) so idle values can blow past 1e308.
import Decimal from 'break_infinity.js';

export { Decimal };
export type Num = Decimal;
export type Source = number | string | Decimal;

export const D = (x: Source = 0): Decimal => new Decimal(x);
export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Human-friendly formatting: 1,234 → "1,234"; 1.2e6 → "1.20M"; huge → mantissa e exp. */
export function fmt(x: Decimal): string {
  if (x.eq(0)) return '0';
  const neg = x.lt(ZERO);
  const abs = x.abs();

  if (abs.lt(1000)) {
    const n = abs.toNumber();
    const s = Number.isInteger(n) ? n.toString() : n.toFixed(1);
    return neg ? '-' + s : s;
  }

  const exp = abs.exponent; // floor(log10(abs))
  if (exp < 6) {
    const s = Math.round(abs.toNumber()).toLocaleString('en-US');
    return neg ? '-' + s : s;
  }

  const tier = Math.floor(exp / 3);
  const scaled = abs.mantissa * Math.pow(10, exp - tier * 3); // in [1, 1000)
  const body = tier < SUFFIXES.length
    ? scaled.toFixed(2) + SUFFIXES[tier]
    : abs.mantissa.toFixed(2) + 'e' + exp;
  return neg ? '-' + body : body;
}
