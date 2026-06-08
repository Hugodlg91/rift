import type { LevelData, LevelCell } from '../types';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';

/** All MVP levels, in play order. */
export const LEVELS: readonly LevelData[] = [level1, level2, level3];

function findToken(grid: LevelCell[][], token: string): { x: number; y: number } | null {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      if (row[x] === token) return { x, y };
    }
  }
  return null;
}

/**
 * Throws if a level grid is malformed: wrong dimensions, or a spawn/exit that
 * is missing or disagrees between the two timelines. Cheap insurance against
 * off-by-one mistakes in the hand-authored grids.
 */
export function validateLevel(level: LevelData, name: string): void {
  const checkDims = (grid: LevelCell[][], layer: string): void => {
    if (grid.length !== level.height) {
      throw new Error(`${name}.${layer}: expected ${level.height} rows, got ${grid.length}`);
    }
    grid.forEach((row, y) => {
      if (row.length !== level.width) {
        throw new Error(
          `${name}.${layer} row ${y}: expected ${level.width} cols, got ${row.length}`,
        );
      }
    });
  };

  checkDims(level.past, 'past');
  checkDims(level.future, 'future');

  for (const token of ['S', 'E']) {
    const p = findToken(level.past, token);
    const f = findToken(level.future, token);
    if (!p) throw new Error(`${name}.past: missing '${token}'`);
    if (!f) throw new Error(`${name}.future: missing '${token}'`);
    if (p.x !== f.x || p.y !== f.y) {
      throw new Error(`${name}: '${token}' mismatch — past(${p.x},${p.y}) vs future(${f.x},${f.y})`);
    }
  }
}

/** Validate every level; call once at boot in development. */
export function validateAllLevels(): void {
  LEVELS.forEach((lvl, i) => validateLevel(lvl, `level${i + 1}`));
}
