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
