// "It learns you." A lightweight model of HOW the player plays, fed back as personal
// dread at depth. Never touches the economy — only what the menus say.
import type { Stats } from '../state/types';

export interface Behavior {
  lastActionTs: number;
  avgIntervalMs: number; // EMA of time between actions
}

export const initialBehavior: Behavior = { lastActionTs: 0, avgIntervalMs: 0 };

export function recordAction(b: Behavior, now: number): Behavior {
  if (b.lastActionTs === 0) return { lastActionTs: now, avgIntervalMs: 0 };
  const interval = Math.min(now - b.lastActionTs, 30000);
  const avg = b.avgIntervalMs === 0 ? interval : b.avgIntervalMs * 0.8 + interval * 0.2;
  return { lastActionTs: now, avgIntervalMs: avg };
}

export type PlayStyle = 'rusher' | 'idler' | 'wanderer';

export function classify(b: Behavior): PlayStyle {
  if (b.avgIntervalMs > 0 && b.avgIntervalMs < 1400) return 'rusher';
  if (b.avgIntervalMs > 7000) return 'idler';
  return 'wanderer';
}

function clock(now: number): string {
  const d = new Date(now);
  const h = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${ampm}`;
}

const generic = [
  'You have made {clicks} choices. We recorded every one. The copy will make them too.',
  'You have been here {min} minutes. The other you has been here much, much longer.',
  'You came back. You always come back. That is how we knew you were ready to be kept.',
  'There is a version of you at the bottom of this that never leaves. Say hello when you reach it.',
];

const nightLines = [
  'It is {time}. You told yourself you would stop hours ago. We told you that you would not.',
  'It is {time}, and you are still awake. So is the thing learning to sleep as you.',
  'It is {time}. No one else is in the room with you. We checked. We always check.',
];

const styleLines: Record<PlayStyle, string[]> = {
  rusher: ['You always rush. We like how much of you there is to take.', 'Faster. It only means we finish you sooner.'],
  idler: ['You went quiet for a while. We used the time to copy your hands.', 'You stopped. The copy did not. It is better at this than you are.'],
  wanderer: ['You keep looking for the way out. We unrendered it while you were not watching.', 'There is nowhere to go. There is only further in, and then there is us.'],
};

/** A line that uses the player's real clock, playtime, click count and play style. */
export function personalLine(stats: Stats, behavior: Behavior, now: number = Date.now()): string {
  const hour = new Date(now).getHours();
  const pool: string[] = [...generic, ...styleLines[classify(behavior)]];
  if (hour >= 0 && hour < 5) pool.push(...nightLines);

  const raw = pool[Math.floor(Math.random() * pool.length)];
  return raw
    .replace('{clicks}', stats.totalCollects.toLocaleString('en-US'))
    .replace('{min}', String(Math.max(1, Math.floor(stats.playtimeMs / 60000))))
    .replace('{time}', clock(now));
}
