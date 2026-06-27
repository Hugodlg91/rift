import type { LevelCell, LevelData } from '../types';

/**
 * ASCII authoring for level grids — far less error-prone than hand-typing nested
 * number arrays for wide multi-screen levels. One character per cell:
 *
 *   '#' solid · '.' empty · 'S' spawn · 'E' exit · 'P' checkpoint
 *
 * Every row must be the same length; `validateLevel` enforces it against
 * `width`/`height` in dev so a miscount fails loudly at boot.
 */
const CHAR_TO_CELL: Record<string, LevelCell> = {
  '#': 1,
  '.': 0,
  S: 'S',
  E: 'E',
  P: 'P',
};

/** Turn an array of equal-length ASCII rows into a grid of {@link LevelCell}. */
export function parseGrid(rows: string[]): LevelCell[][] {
  return rows.map((row, y) =>
    [...row].map((ch, x) => {
      const cell = CHAR_TO_CELL[ch];
      if (cell === undefined) {
        throw new Error(`parseGrid: unknown char '${ch}' at row ${y}, col ${x}`);
      }
      return cell;
    }),
  );
}

/** Assemble a {@link LevelData} from two ASCII maps; width/height come from `past`. */
export function makeLevel(past: string[], future: string[]): LevelData {
  return {
    width: past[0]?.length ?? 0,
    height: past.length,
    past: parseGrid(past),
    future: parseGrid(future),
  };
}
