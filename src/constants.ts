import type { WorldDef, WorldId } from './types';

/** Size of one tile, in pixels. */
export const TILE_SIZE = 32;

/** Canvas dimensions. 25 tiles wide x 14 tiles tall. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 448;

/** Downward gravity applied by Arcade Physics. */
export const GRAVITY_Y = 600;

// ---------------------------------------------------------------------------
//  Palette (Phase B) — 4-tone ramps per world with hue-shifting
// ---------------------------------------------------------------------------

/**
 * Per-world colour ramps. Shadows shift cool, highlights shift warm. The
 * `accent` is reserved for things the player interacts with (exit, glow); decor
 * stays desaturated. This is the single source of truth for world colour.
 */
export const PALETTE = {
  past: {
    // RUINES — warm, desaturated, melancholic
    bgFar: 0x0d0805,
    bgMid: 0x1a1008,
    bgNear: 0x2a1c0e,
    tileShadow: 0x4a3318,
    tileBase: 0x6b4f2a,
    tileMid: 0x8b6914,
    tileHighlight: 0xd4a017,
    accent: 0xe8b43a,
    hazard: 0xc73e1d,
    glow: 0xffd27a,
  },
  future: {
    // CYBER — cool, neon, clinical
    bgFar: 0x01040d,
    bgMid: 0x020818,
    bgNear: 0x06112b,
    tileShadow: 0x06304f,
    tileBase: 0x0a4a7a,
    tileMid: 0x0d6ba8,
    tileHighlight: 0x1a9fd4,
    accent: 0x00f5ff,
    hazard: 0xff2d6e,
    glow: 0x7af5ff,
  },
} as const;

/** Lookup a world's colour ramp by id. */
export function getPalette(id: WorldId): (typeof PALETTE)[WorldId] {
  return id === 'past' ? PALETTE.past : PALETTE.future;
}

// ---------------------------------------------------------------------------
//  Worlds (identity + the handful of colours other systems still reference)
// ---------------------------------------------------------------------------

export const WORLDS = {
  PAST: {
    id: 'past',
    label: '🏚️ PASSÉ',
    bgColor: PALETTE.past.bgMid,
    platformColor: PALETTE.past.tileMid,
    accentColor: PALETTE.past.accent,
    flashColor: PALETTE.past.glow,
  },
  FUTURE: {
    id: 'future',
    label: '⚡ FUTUR',
    bgColor: PALETTE.future.bgMid,
    platformColor: PALETTE.future.tileMid,
    accentColor: PALETTE.future.accent,
    flashColor: PALETTE.future.glow,
  },
} as const satisfies Record<string, WorldDef>;

/** Lookup a world definition by its id. */
export function getWorld(id: WorldId): WorldDef {
  return id === 'past' ? WORLDS.PAST : WORLDS.FUTURE;
}

/** The opposite world of the one given. */
export function otherWorld(id: WorldId): WorldId {
  return id === 'past' ? 'future' : 'past';
}

/** Convert a 0xRRGGBB integer to a `#rrggbb` CSS string (for Text styles). */
export function toCSS(color: number): string {
  return '#' + (color & 0xffffff).toString(16).padStart(6, '0');
}

// ---------------------------------------------------------------------------
//  World switch
// ---------------------------------------------------------------------------

export const SWITCH_KEY = 'F';
/** Anti-spam delay between two successful switches. */
export const SWITCH_COOLDOWN_MS = 400;
/** Red flash shown when a switch is denied (would crush the player). */
export const DENIED_FLASH_COLOR = 0xff3030;

// ---------------------------------------------------------------------------
//  Player
// ---------------------------------------------------------------------------

export const PLAYER_SPEED = 180; // px/s horizontal
export const JUMP_VELOCITY = -420; // initial jump impulse
export const MAX_AIR_JUMPS = 1; // double-jump = 1 extra jump while airborne
export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 28;
/** Delay before respawning after a death. */
export const RESPAWN_DELAY_MS = 800;

/**
 * Game-feel tuning (Phase A). All the "juice" knobs in one place so the moment-
 * to-moment handling can be tweaked without hunting through Player.ts.
 */
export const FEEL = {
  COYOTE_MS: 100, // jump still allowed this long after leaving a ledge
  JUMP_BUFFER_MS: 120, // a jump press is remembered this long before landing
  JUMP_CUT_MULT: 0.4, // releasing jump mid-rise keeps only this much upward vel
  ACCEL: 1200, // horizontal acceleration toward target speed (px/s²)
  FRICTION_GROUND: 1600, // horizontal deceleration when no input (px/s²)
  AIR_CONTROL: 0.55, // accel & friction are scaled by this while airborne
  APEX_GRAVITY_MULT: 0.6, // lighter gravity near the top of a jump (float)
  APEX_THRESHOLD: 60, // |vy| under which the apex float kicks in
  FAST_FALL_MULT: 1.3, // heavier gravity while descending (snappier fall)
  CORNER_CORRECTION_PX: 4, // nudge to slip past a ceiling corner when rising
} as const;

// ---------------------------------------------------------------------------
//  Level grid cell tokens
// ---------------------------------------------------------------------------

export const CELL = {
  EMPTY: 0,
  SOLID: 1,
  SPAWN: 'S',
  EXIT: 'E',
} as const;

// ---------------------------------------------------------------------------
//  Texture keys (generated in BootScene)
// ---------------------------------------------------------------------------

export const TEX = {
  PLAYER: 'player',
  EXIT_PAST: 'exit_past',
  EXIT_FUTURE: 'exit_future',
  DUST: 'dust',
  VIGNETTE: 'vignette',
  GLOW: 'glow',
} as const;

/** Number of random interior tile variants generated per world. */
export const TILE_VARIANTS = 3;

/** Texture key for an interior tile variant of a world. */
export const tileKey = (world: WorldId, variant: number): string => `tile_${world}_${variant}`;
/** Texture key for a world's top-edge tile (lit accent rim). */
export const tileEdgeKey = (world: WorldId): string => `tile_${world}_edge`;
/** Texture key for a parallax layer (0 = far … 2 = near) of a world. */
export const parallaxKey = (world: WorldId, layer: number): string => `px_${world}_${layer}`;
/** Player texture with a baked-in accent rim (used as the Canvas fallback for the postFX glow). */
export const playerAccentKey = (world: WorldId): string => `player_${world}`;

// ---------------------------------------------------------------------------
//  Scene keys
// ---------------------------------------------------------------------------

export const SCENE = {
  BOOT: 'BootScene',
  MENU: 'MenuScene',
  GAME: 'GameScene',
  UI: 'UIScene',
  END: 'EndScene',
} as const;

/** Total number of levels in the MVP. */
export const TOTAL_LEVELS = 3;
