import type { WorldDef, WorldId } from './types';

/** Size of one tile, in pixels. */
export const TILE_SIZE = 32;

/** Canvas dimensions. 25 tiles wide x 14 tiles tall. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 448;

/** Downward gravity applied by Arcade Physics. */
export const GRAVITY_Y = 600;

// ---------------------------------------------------------------------------
//  Worlds
// ---------------------------------------------------------------------------

export const WORLDS = {
  PAST: {
    id: 'past',
    label: '🏚️ PASSÉ',
    bgColor: 0x1a1008, // brun très sombre
    platformColor: 0x8b6914, // ocre/marron
    accentColor: 0xd4a017, // doré chaud
    flashColor: 0xffd700,
  },
  FUTURE: {
    id: 'future',
    label: '⚡ FUTUR',
    bgColor: 0x020818, // bleu nuit profond
    platformColor: 0x0a4a7a, // bleu acier
    accentColor: 0x00f5ff, // cyan néon
    flashColor: 0x00f5ff,
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
  TILE_PAST: 'tile_past',
  TILE_FUTURE: 'tile_future',
  PLAYER: 'player',
  EXIT_PAST: 'exit_past',
  EXIT_FUTURE: 'exit_future',
  DUST: 'dust',
} as const;

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
