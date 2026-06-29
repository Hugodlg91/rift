import { makeLevel } from './parse';
import type { LevelData } from '../types';

/**
 * Programmatic level authoring. Hand-typing two 14×60 ASCII grids per level and
 * keeping every row the same length is error-prone; a builder makes width/height
 * correct *by construction* and throws on any out-of-bounds stamp, so coordinate
 * mistakes surface the moment `verify` runs (see scripts) rather than silently in
 * the browser. Tokens are the same as {@link parseGrid} (`#`, `^`, `=`, `S`, …).
 *
 * Typical usage: build a shared `base` (frame + spawn/exit + common geometry),
 * `clone()` it into `past`/`future`, then stamp the per-timeline differences.
 */
export class GridBuilder {
  private readonly cells: string[][];

  constructor(
    readonly width: number,
    readonly height: number,
    fill = '.',
  ) {
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => fill),
    );
  }

  private check(x: number, y: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      throw new Error(`GridBuilder: (${x},${y}) out of bounds for ${this.width}×${this.height}`);
    }
  }

  /** Set a single cell. */
  set(x: number, y: number, c: string): this {
    this.check(x, y);
    this.cells[y][x] = c;
    return this;
  }

  /** Horizontal run of `len` cells starting at (x, y). */
  hLine(x: number, y: number, len: number, c: string): this {
    for (let i = 0; i < len; i++) this.set(x + i, y, c);
    return this;
  }

  /** Vertical run of `len` cells starting at (x, y) going down. */
  vLine(x: number, y: number, len: number, c: string): this {
    for (let i = 0; i < len; i++) this.set(x, y + i, c);
    return this;
  }

  /** Filled `w`×`h` rectangle with its top-left at (x, y). */
  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) this.hLine(x, y + j, w, c);
    return this;
  }

  /** Carve a pit: clear the floor (and anything else) over columns [x, x+len). */
  clearCol(x: number, len = 1, fromY = 0): this {
    for (let i = 0; i < len; i++) this.vLine(x + i, fromY, this.height - fromY, '.');
    return this;
  }

  /**
   * Solid enclosure: left/right walls full height, an optional ceiling row, and
   * a floor `floorThickness` tiles deep along the bottom. The shared starting
   * point for every hand-authored level.
   */
  frame(floorThickness = 2, ceiling = true): this {
    this.vLine(0, 0, this.height, '#');
    this.vLine(this.width - 1, 0, this.height, '#');
    if (ceiling) this.hLine(0, 0, this.width, '#');
    for (let j = 0; j < floorThickness; j++) {
      this.hLine(0, this.height - 1 - j, this.width, '#');
    }
    return this;
  }

  /** Deep copy — used to fork a shared base into the two timelines. */
  clone(): GridBuilder {
    const g = new GridBuilder(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) g.cells[y][x] = this.cells[y][x];
    }
    return g;
  }

  /** Render to the ASCII rows that {@link makeLevel} consumes. */
  rows(): string[] {
    return this.cells.map((r) => r.join(''));
  }
}

/** Assemble a {@link LevelData} from two builders (same dimensions guaranteed). */
export function build(past: GridBuilder, future: GridBuilder): LevelData {
  return makeLevel(past.rows(), future.rows());
}
