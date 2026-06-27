import type { Ability, LevelData, LevelCell, LevelMeta } from '../types';
import { stubLevel } from './stub';

/** The three chapters, each with its identity and signature mechanic. */
export const CHAPTERS: Record<number, { name: string }> = {
  1: { name: 'LES RUINES' },
  2: { name: 'LA FRACTURE' },
  3: { name: 'TEMPS PROFOND' },
};

// Abilities unlocked cumulatively per chapter (DEVLOG_NEXT §6.1).
const CH1: Ability[] = ['switch', 'doubleJump'];
const CH2: Ability[] = ['switch', 'doubleJump', 'dash', 'wallJump'];
const CH3: Ability[] = ['switch', 'doubleJump', 'dash', 'wallJump', 'echo'];

/**
 * 12 levels across 3 chapters (Phase G). For now each `data` is a playable STUB
 * (see `stub.ts`) so the structure — chapters, per-chapter abilities, tutorials,
 * progression — is in place; real hand-authored content replaces these chapter
 * by chapter.
 */
export const LEVELS: readonly LevelMeta[] = [
  { id: 1, name: '1-1', chapter: 1, abilities: CH1, data: stubLevel(12) },
  { id: 2, name: '1-2', chapter: 1, abilities: CH1, data: stubLevel(16) },
  { id: 3, name: '1-3', chapter: 1, abilities: CH1, data: stubLevel(10) },
  { id: 4, name: '1-4', chapter: 1, abilities: CH1, data: stubLevel(18) },
  { id: 5, name: '2-1', chapter: 2, abilities: ['switch', 'doubleJump', 'dash'], introduces: 'dash', data: stubLevel(13) },
  { id: 6, name: '2-2', chapter: 2, abilities: CH2, introduces: 'wallJump', data: stubLevel(15) },
  { id: 7, name: '2-3', chapter: 2, abilities: CH2, data: stubLevel(11) },
  { id: 8, name: '2-4', chapter: 2, abilities: CH2, data: stubLevel(19) },
  { id: 9, name: '3-1', chapter: 3, abilities: CH3, introduces: 'echo', data: stubLevel(12) },
  { id: 10, name: '3-2', chapter: 3, abilities: CH3, data: stubLevel(17) },
  { id: 11, name: '3-3', chapter: 3, abilities: CH3, data: stubLevel(14) },
  { id: 12, name: '3-4', chapter: 3, abilities: CH3, data: stubLevel(20) },
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
