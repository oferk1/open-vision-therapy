import type { ArrowDir } from './types';

export const ARROW_DIRS: ArrowDir[] = ['up', 'down', 'left', 'right'];

export function randDir(exclude?: ArrowDir): ArrowDir {
  const pool = exclude ? ARROW_DIRS.filter((d) => d !== exclude) : ARROW_DIRS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function dirArrow(dir: ArrowDir): string {
  switch (dir) {
    case 'up':
      return '\u25B2';
    case 'down':
      return '\u25BC';
    case 'left':
      return '\u25C0';
    case 'right':
      return '\u25B6';
  }
}

export function dirLabel(dir: ArrowDir): string {
  switch (dir) {
    case 'up':
      return 'Up';
    case 'down':
      return 'Down';
    case 'left':
      return 'Left';
    case 'right':
      return 'Right';
  }
}

/** Format seconds as m:ss. */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtPercent(p: number): string {
  return `${Math.round(p * 100)}%`;
}
