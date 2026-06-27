import type { LevelData, LevelCell, LevelMeta } from '../types';
import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';

/**
 * All levels in play order, each with its active abilities. NOTE: with only the
 * three chapter-1 levels so far, dash/wallJump are granted on levels 2-3 so the
 * systems (gating + tutorials) are demonstrable; the final chapter/ability
 * layout lands with the 12-level content (Phase G).
 */
export const LEVELS: readonly LevelMeta[] = [
  { id: 1, name: 'Premier Rift', chapter: 1, abilities: ['switch', 'doubleJump'], data: level1 },
  { id: 2, name: 'Le Gouffre', chapter: 1, abilities: ['switch', 'doubleJump', 'dash'], introduces: 'dash', data: level2 },
  { id: 3, name: 'Le Gantelet', chapter: 1, abilities: ['switch', 'doubleJump', 'dash', 'wallJump', 'echo'], introduces: 'echo', data: level3 },
];

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

  // Checkpoint 'P' is optional, but must sit at the same cell in both timelines
  // (respawn is world-agnostic) if it's there at all.
  const cp = findToken(level.past, 'P');
  const cf = findToken(level.future, 'P');
  if (!!cp !== !!cf) throw new Error(`${name}: checkpoint 'P' present in only one timeline`);
  if (cp && cf && (cp.x !== cf.x || cp.y !== cf.y)) {
    throw new Error(`${name}: 'P' mismatch — past(${cp.x},${cp.y}) vs future(${cf.x},${cf.y})`);
  }
}

/** Validate every level; call once at boot in development. */
export function validateAllLevels(): void {
  LEVELS.forEach((lvl, i) => validateLevel(lvl.data, `level${i + 1}`));
}
