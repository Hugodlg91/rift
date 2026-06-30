import { GridBuilder, build } from './builder';
import type { LevelData } from '../types';

/**
 * CHAPITRE 2 — LA FRACTURE.  Capacités : switch + double saut + DASH + SAUT MURAL.
 * Hazards : pics (PASSÉ) / lasers (FUTUR) — token '^' — et plateformes mobiles 'M'.
 *
 * RÈGLE DE CONCEPTION (sinon on bloque le joueur) : un mur PLEINE HAUTEUR ne va
 * QUE dans un seul monde — c'est un MUR DE PHASE qu'on franchit en switchant —
 * jamais dans la base partagée (ce serait un cul-de-sac dans les deux mondes).
 * Le saut mural se travaille sur des CHEMINÉES à shard : deux parois suspendues,
 * ouvertes au sol (on passe dessous), qu'on remonte en rebond pour le bonus.
 *
 * Calibrage : saut ≈ 4–5 tuiles ; double saut ≈ 7–8 haut / 8–9 portée ;
 * dash ≈ 2,5–3 tuiles à plat (i-frames pendant le dash) ; sol = lignes 12-13.
 */

const H = 14;
const STAND = 11;

/** Fosse mortelle : enlève le sol sur `len` colonnes. */
function pit(g: GridBuilder, x: number, len: number): void {
  for (let i = 0; i < len; i++) {
    g.set(x + i, H - 2, '.');
    g.set(x + i, H - 1, '.');
  }
}

/** Pics/lasers au sol (ligne STAND). */
function spikes(g: GridBuilder, x: number, len: number): void {
  for (let i = 0; i < len; i++) g.set(x + i, STAND, '^');
}

/** Cheminée à saut mural : deux parois suspendues (lignes 1..top, écart de 2),
 *  ouvertes en bas → on passe dessous au sol, on remonte en rebond pour un shard. */
function chimney(g: GridBuilder, x: number, top = 7): void {
  g.vLine(x, 1, top, '#');
  g.vLine(x + 3, 1, top, '#');
}

// ---------------------------------------------------------------------------
// 2-1 — ENSEIGNER le dash
// ---------------------------------------------------------------------------
// Solution : plafond bas (ligne 10) sur x9-16 → impossible de sauter ; DASH à
// travers le pic (x12) grâce aux i-frames. Checkpoint (x20). Fosse (x27-29) au
// double saut. Mur de phase PASSÉ (x39) → switch FUTUR → sortie.
function level2_1(): LevelData {
  const W = 48;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x45

  base.hLine(9, 10, 8, '#'); // plafond bas : on ne peut pas sauter par-dessus le pic
  spikes(base, 12, 1); // un seul pic → dash (i-frames), large pour apprendre
  base.set(20, STAND, 'P'); // checkpoint
  pit(base, 27, 3); // fosse — double saut

  const past = base.clone();
  past.vLine(39, 1, 11, '#'); // mur de phase PASSÉ
  past.set(20, 7, 'o'); // shard au-dessus du checkpoint

  const future = base.clone(); // FUTUR : le mur est ouvert
  future.set(35, 8, 'o'); // shard de récompense après la fosse

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-2 — ENSEIGNER le saut mural
// ---------------------------------------------------------------------------
// Solution : fosse (x11-14) double saut → CHEMINÉE (x18/x21) : on passe dessous,
// puis on remonte en SAUT MURAL pour le shard au sommet (x19, ligne 1). Pic sous
// plafond bas (x27) → dash. Fosse (x31-34) double saut. Mur de phase PASSÉ (x38)
// → switch FUTUR → sortie.
function level2_2(): LevelData {
  const W = 48;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x45

  pit(base, 11, 4); // double saut
  chimney(base, 18); // parois x18 & x21 (lignes 1-7) — saut mural pour le shard
  base.hLine(25, 10, 5, '#'); // plafond bas
  spikes(base, 27, 1); // pic sous plafond → dash
  pit(base, 31, 4); // double saut

  const past = base.clone();
  past.vLine(38, 1, 11, '#'); // mur de phase PASSÉ → switch FUTUR pour finir
  past.set(19, 1, 'o'); // shard tout en haut de la cheminée
  past.set(8, 9, 'o'); // shard au sol (départ)

  const future = base.clone();
  future.set(43, 8, 'o'); // shard FUTUR

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-3 — TWISTER  (dash + switch + plateforme mobile + cheminée)
// ---------------------------------------------------------------------------
// Solution : pic sous plafond (x8) → dash. Fosse (x13-17) franchie par la
// plateforme MOBILE (FUTUR) — switch FUTUR, on monte dessus. Checkpoint (x21).
// Cheminée à shard (x27). 2e pic (x37) → dash. Fosse (x42-45) double saut. Mur
// de phase PASSÉ (x48) → switch → sortie.
function level2_3(): LevelData {
  const W = 58;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x55

  base.hLine(6, 10, 5, '#'); // plafond bas
  spikes(base, 8, 1); // → dash
  pit(base, 13, 5); // fosse — mobile FUTUR
  base.set(21, STAND, 'P'); // checkpoint
  chimney(base, 27); // shard saut mural
  base.hLine(35, 10, 5, '#'); // plafond bas
  spikes(base, 37, 1); // → dash
  pit(base, 42, 4); // double saut

  const past = base.clone();
  past.vLine(48, 1, 11, '#'); // mur de phase PASSÉ → switch
  past.set(28, 1, 'o'); // shard cheminée

  const future = base.clone();
  future.set(15, STAND - 1, 'M'); // plateforme mobile sur la fosse (FUTUR)
  future.set(50, 8, 'o'); // shard

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-4 — INTÉGRER
// ---------------------------------------------------------------------------
// Solution : fosse (x8-10) double saut. Pic sous plafond (x15) → dash. Fosse
// (x19-23) mobile FUTUR. Checkpoint (x28). Cheminée à shard (x34). GRAND vide
// (x42-47) double saut. Checkpoint (x50). Pic sous plafond (x56) → dash. Énigme
// finale : fosse (x60-63) + mur de phase FUTUR (x65) → switch PASSÉ (pierre de
// gué x61) → sortie.
function level2_4(): LevelData {
  const W = 70;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x67

  pit(base, 8, 3); // double saut
  base.hLine(13, 10, 5, '#'); // plafond bas
  spikes(base, 15, 1); // → dash
  pit(base, 19, 5); // mobile FUTUR
  base.set(28, STAND, 'P'); // checkpoint 1
  chimney(base, 34); // shard saut mural
  pit(base, 42, 6); // grand vide — double saut
  base.set(50, STAND, 'P'); // checkpoint 2
  base.hLine(54, 10, 5, '#'); // plafond bas
  spikes(base, 56, 1); // → dash
  pit(base, 60, 4); // fosse de l'énigme finale

  const past = base.clone();
  past.set(61, 10, '#'); // pierre de gué de l'énigme finale (PASSÉ)
  past.set(35, 1, 'o'); // shard cheminée

  const future = base.clone();
  future.set(21, STAND - 1, 'M'); // mobile sur la fosse seg.2 (FUTUR)
  future.vLine(65, 1, 11, '#'); // mur de phase FUTUR (force le PASSÉ en fin)
  future.set(45, 8, 'o'); // shard au-dessus du grand vide

  return build(past, future);
}

/** Les 4 niveaux du chapitre 2, dans l'ordre. */
export const CHAPTER2: readonly LevelData[] = [
  level2_1(),
  level2_2(),
  level2_3(),
  level2_4(),
];
