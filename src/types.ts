/**
 * Shared TypeScript interfaces for RIFT.
 */

/** The two timelines the player can shift between. */
export type WorldId = 'past' | 'future';

/** Visual + identity definition for a single world. */
export interface WorldDef {
  readonly id: WorldId;
  readonly label: string;
  readonly bgColor: number;
  readonly platformColor: number;
  readonly accentColor: number;
  readonly flashColor: number;
}

/**
 * A single cell in a level grid.
 * `1` = solid platform, `0` = empty, `'S'` = spawn, `'E'` = exit.
 * Kept loose (number | string) so the hand-authored grids type-check cleanly.
 */
export type LevelCell = number | string;

/** One level = two grids of identical dimensions (past + future). */
export interface LevelData {
  /** Width in tiles. */
  width: number;
  /** Height in tiles. */
  height: number;
  past: LevelCell[][];
  future: LevelCell[][];
}

/** A position expressed in world (pixel) coordinates. */
export interface Point {
  x: number;
  y: number;
}
