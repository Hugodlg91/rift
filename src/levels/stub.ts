import { makeLevel } from './parse';
import type { LevelData } from '../types';

/**
 * A short, playable placeholder level: bordered floor, spawn on the left, exit
 * on the right, and one PAST-only full-height wall that forces a single switch.
 * Used to scaffold the 12-level / 3-chapter structure (Phase G framework); real
 * hand-authored content replaces these incrementally per chapter.
 */
export function stubLevel(wallCol: number): LevelData {
  const W = 30;
  const H = 14;
  const last = W - 1;
  const floorTop = H - 2; // rows floorTop..H-1 are solid ground
  const spawnRow = floorTop - 1; // S/E sit on the floor

  const rowFor = (world: 'past' | 'future', y: number): string => {
    if (y === 0 || y >= floorTop) return '#'.repeat(W);
    const cells = new Array<string>(W).fill('.');
    cells[0] = '#';
    cells[last] = '#';
    if (world === 'past') cells[wallCol] = '#'; // PAST-only wall (open in the FUTURE)
    if (y === spawnRow) {
      cells[2] = 'S';
      cells[W - 3] = 'E';
    }
    return cells.join('');
  };

  const past: string[] = [];
  const future: string[] = [];
  for (let y = 0; y < H; y++) {
    past.push(rowFor('past', y));
    future.push(rowFor('future', y));
  }
  return makeLevel(past, future);
}
