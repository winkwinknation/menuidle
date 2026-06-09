// The dread layer — presentation only. It NEVER touches the economy (bones stay
// deterministic); it corrupts how menus *read* and *feel* as you descend. Corruption is
// seeded per (label, depth) so it's stable across renders instead of flickering.
import { mulberry32 } from './prng';
import { hashString } from './hash';

export type Intensity = 'off' | 'mild' | 'full';

// Band thresholds by tier — a slow burn that turns hard once it starts. Band 1 still lands at tier 12
// (the clean surface is the trap), but the deeper bands now come faster — the descent into the body.
const BAND_THRESHOLDS = [12, 24, 45, 80, 140, 240];
export const BAND_NAMES = ['Corporate', 'Uncanny', 'Wrong', 'The Harvest', 'It Knows You', 'Flayed', 'The Hollow'];

export function dreadBand(depth: number): number {
  let b = 0;
  for (const t of BAND_THRESHOLDS) if (depth >= t) b++;
  return b; // 0..6
}

/** Mild caps the horror at band 3 (atmosphere, no aggressive/personal stuff). Off = clean. */
export function effectiveBand(depth: number, intensity: Intensity): number {
  if (intensity === 'off') return 0;
  const b = dreadBand(depth);
  return intensity === 'mild' ? Math.min(b, 3) : b;
}

const SUFFIX: Record<number, string[]> = {
  1: [' (Recommended)', ' (do not change)', ' (leave this one)', ' (it was off a second ago)'],
  2: [' — who turned this back on?', ' (you changed this. we changed it back.)', ' (again)', ' (warm)'],
  3: [' [locked from the inside]', ' — do not open', ' (it remembers your name)', ' (still wet)'],
  4: [' (this one is about you)', ' — stop reading', ' (you opened this before. you will again.)', ' (it has your face)'],
  5: [' (it is wearing your settings)', ' — there is meat behind this', ' (we kept your eyes)', ' ▒ do not ▒'],
  6: [' …it is almost you now', ' (the original is still screaming)', ' (collect this to finish yourself)', ' ▓ no exit ▓'],
};

// Word substitutions — escalate from uncanny to body horror to threat. Keyed by the band they unlock at.
const SUBS: Record<number, [RegExp, string][]> = {
  2: [
    [/\bSettings\b/i, 'Yourself'],
    [/\bDisplay\b/i, 'What You Look Like Now'],
    [/\bSound\b/i, 'the sound you made'],
    [/\bPrivacy\b/i, 'what we found in you'],
    [/\bHistory\b/i, 'what you did'],
    [/\bGeneral\b/i, 'It Knows'],
  ],
  3: [
    [/\bStorage\b/i, 'where we keep the others'],
    [/\bSecurity\b/i, 'what keeps you in'],
    [/\bAccount\b/i, 'your remains'],
    [/\bSystem\b/i, 'the thing under the System'],
    [/\bUpdate\b/i, 'overwrite you'],
    [/\bRestart\b/i, 'Restart You'],
    [/\bRecovery\b/i, 'there is no recovery'],
    [/\bBackup\b/i, 'a copy of you'],
  ],
  4: [
    [/\b[\w-]*Settings\b/i, 'It Configures You'],
    [/\bNetwork\b/i, 'who else is trapped here'],
    [/\bUsers?\b/i, 'the digested'],
    [/\bHelp\b/i, 'no one is coming'],
    [/\bDevices?\b/i, "what's left of them"],
  ],
  5: [
    [/\bMemory\b/i, 'your marrow'],
    [/\bProfile\b/i, 'your skin'],
    [/\bData\b/i, 'the parts of you we can still read'],
    [/\bDelete\b/i, 'swallow'],
    [/\bManage\b/i, 'flay'],
  ],
  6: [
    [/\b[\w][\w -]*\b/, 'you'], // at the bottom everything is just you
  ],
};

function zalgo(rng: () => number, s: string, maxMarks: number): string {
  let out = '';
  for (const ch of s) {
    out += ch;
    if (ch !== ' ') {
      const n = Math.floor(rng() * (maxMarks + 1));
      for (let i = 0; i < n; i++) out += String.fromCharCode(0x300 + Math.floor(rng() * 0x6f));
    }
  }
  return out;
}

/** Deterministically marks ~8% of items as "watchers" (an eye) once things get Wrong. */
export function isWatcher(label: string, depth: number, index: number, intensity: Intensity): boolean {
  if (effectiveBand(depth, intensity) < 3) return false;
  return hashString(label + '#' + index + '@' + depth) % 100 < 8;
}

export function corruptLabel(label: string, depth: number, intensity: Intensity): string {
  const band = effectiveBand(depth, intensity);
  if (band <= 0) return label;
  const rng = mulberry32(hashString(label + '@' + Math.min(depth, 9999)));
  let out = label;

  // Apply the most disturbing available substitution that matches.
  for (let b = Math.min(band, 6); b >= 2; b--) {
    const subs = SUBS[b];
    if (!subs) continue;
    let changed = false;
    for (const [re, rep] of subs) {
      if (re.test(out) && rng() < 0.6) {
        out = out.replace(re, rep);
        changed = true;
        break;
      }
    }
    if (changed) break;
  }

  // Creep suffix, more likely the deeper you are.
  if (rng() < 0.18 + 0.1 * band) {
    const pool = SUFFIX[Math.min(band, 6)];
    if (pool) out += pool[Math.floor(rng() * pool.length)];
  }

  // Text decay at the bottom (bounded — static, photosensitivity-safe).
  if (band >= 5) out = zalgo(rng, out, band === 6 ? 2 : 1);

  return out;
}
