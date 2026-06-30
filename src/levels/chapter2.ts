import { GridBuilder, build } from './builder';
import type { LevelData } from '../types';

/**
 * CHAPITRE 2 — LA FRACTURE.  Capacités : switch + double saut + DASH + SAUT MURAL.
 * Hazards signature : pics (PASSÉ) / lasers (FUTUR) — token '^' — et plateformes
 * mobiles 'M'. La DA du chapitre (plus saturée) est appliquée automatiquement.
 *
 * Méthode enseigner → tester → twister → intégrer :
 *   2-1 ENSEIGNER dash   — plafonds bas : impossible de sauter, il faut DASHER
 *                          (à plat / i-frames) pour franchir pics et fosses.
 *   2-2 ENSEIGNER mural  — puits verticaux trop hauts pour le double saut : on
 *                          remonte en SAUT MURAL de paroi en paroi.
 *   2-3 TWISTER          — dash ET saut mural mêlés au switch + plateforme mobile.
 *   2-4 INTÉGRER         — long parcours : pics, mobiles, puits, dash, switch,
 *                          deux checkpoints, énigmes de monde.
 *
 * Calibrage : saut ≈ 4–5 tuiles ; double saut ≈ 7–8 de haut / 8–9 de portée ;
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

/** Pics/lasers au sol (sur la ligne STAND). */
function spikes(g: GridBuilder, x: number, len: number): void {
  for (let i = 0; i < len; i++) g.set(x + i, STAND, '^');
}

// ---------------------------------------------------------------------------
// 2-1 — ENSEIGNER le dash
// ---------------------------------------------------------------------------
// Solution : plafond bas (ligne 10) sur x9-16 → impossible de sauter ; DASH à
// travers le pic (x12) grâce aux i-frames (le dash dure ~2,5 tuiles, large pour
// un seul pic). Checkpoint (x20). Fosse (x27-29) franchie au double saut. Mur de
// phase PASSÉ (x39) → switch → sortie.
function level2_1(): LevelData {
  const W = 48;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x45

  base.hLine(9, 10, 8, '#'); // plafond bas : on ne peut pas sauter par-dessus le pic
  spikes(base, 12, 1); // un seul pic → dash (i-frames), large pour apprendre
  base.set(20, STAND, 'P'); // checkpoint

  pit(base, 27, 3); // fosse — double saut (le dash est déjà acquis au pic)

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
// Solution : un mur plein barre le chemin (x16, lignes 1-11), trop haut pour le
// double saut. Juste avant, un PUITS étroit (x13-14) entre deux parois (x12/x15)
// monte jusqu'en haut : SAUT MURAL de paroi en paroi pour atteindre la corniche
// (ligne 3, x16-22) qui passe au-dessus du mur. Redescente côté droit, fosse
// (x30-32) à double-sauter, puis 2e puits mural (x37-38) menant au shard haut.
function level2_2(): LevelData {
  const W = 50;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x47

  // Puits mural n°1 : parois x12 et x15, montée x13-14.
  base.vLine(12, 1, 11, '#');
  base.vLine(15, 4, 8, '#'); // paroi droite (s'arrête ligne 4 → on sort en haut)
  base.hLine(16, 3, 7, '#'); // corniche qui enjambe le mur, lignes 3, x16-22
  base.vLine(23, 3, 9, '#'); // bout de la corniche → on retombe à droite

  pit(base, 30, 3); // fosse — double saut

  // Puits mural n°2 (optionnel, mène à un shard) : parois x36 et x39.
  base.vLine(36, 2, 10, '#');
  base.vLine(39, 2, 10, '#');

  const past = base.clone();
  past.set(20, 2, 'o'); // shard sur la corniche
  past.set(37, 1, 'o'); // shard en haut du puits n°2

  const future = base.clone();

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-3 — TWISTER  (dash + saut mural + switch + plateforme mobile)
// ---------------------------------------------------------------------------
// Solution : plafond bas + pics (x8-9) → dash. Plateforme MOBILE (x14, FUTUR
// seulement) franchit la grande fosse (x12-18) : switch FUTUR, on monte dessus,
// elle nous porte. Checkpoint (x22). Puits mural de phase : paroi pleine x28
// (PASSÉ) + paroi x31 → switch PASSÉ pour avoir les deux parois, saut mural vers
// la corniche (ligne 3). Fin : pics (x40-41) à dasher → sortie (x46).
function level2_3(): LevelData {
  const W = 60;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x57

  base.hLine(6, 10, 6, '#'); // plafond bas
  spikes(base, 8, 1); // → dash (un seul pic, large pour l'i-frame)

  pit(base, 12, 5); // fosse — franchie par la mobile (FUTUR)
  base.set(22, STAND, 'P'); // checkpoint

  base.hLine(29, 3, 6, '#'); // corniche du puits mural (lignes 3, x29-34)
  base.vLine(31, 3, 9, '#'); // paroi droite du puits

  spikes(base, 40, 1); // pic final → dash
  base.hLine(38, 10, 6, '#'); // plafond bas sur le pic final

  const past = base.clone();
  past.vLine(28, 1, 11, '#'); // paroi gauche du puits (PASSÉ) → switch pour l'avoir
  past.set(33, 2, 'o'); // shard sur la corniche

  const future = base.clone();
  future.set(14, STAND - 1, 'M'); // plateforme mobile au-dessus de la fosse (FUTUR)
  future.set(50, 8, 'o'); // shard

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-4 — INTÉGRER
// ---------------------------------------------------------------------------
// Solution : fosse (x8-10) double saut. Pics sous plafond bas (x14-15) → dash.
// Mobile (x20, FUTUR) sur la fosse (x18-24) → switch FUTUR. Checkpoint (x27).
// Puits mural (parois x33/x36) vers corniche (ligne 3). Redescente, GRAND vide
// (x42-49) double saut. Mur de phase FUTUR (x53) barrant une fosse (x52-56) →
// switch PASSÉ → pierre de gué (x54). Pics finaux (x60-61) → dash. Sortie (x69).
function level2_4(): LevelData {
  const W = 72;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x69

  pit(base, 8, 3); // double saut
  base.hLine(12, 10, 6, '#'); // plafond bas
  spikes(base, 14, 1); // → dash
  pit(base, 18, 5); // mobile (FUTUR)
  base.set(27, STAND, 'P'); // checkpoint 1

  base.hLine(33, 3, 6, '#'); // corniche du puits mural (lignes 3, x33-38)
  base.vLine(33, 3, 9, '#');
  base.vLine(36, 5, 7, '#'); // parois du puits

  pit(base, 42, 6); // grand vide — double saut tendu
  base.set(50, STAND, 'P'); // checkpoint 2
  pit(base, 52, 5); // fosse de l'énigme finale
  spikes(base, 60, 1); // pic final → dash
  base.hLine(58, 10, 6, '#'); // plafond bas sur le pic

  const past = base.clone();
  past.set(54, 10, '#'); // pierre de gué de l'énigme finale (PASSÉ)
  past.set(40, 7, 'o'); // shard

  const future = base.clone();
  future.set(20, STAND - 1, 'M'); // mobile sur la fosse seg.2 (FUTUR)
  future.vLine(53, 1, 11, '#'); // mur de phase FUTUR (force le PASSÉ)
  future.set(35, 1, 'o'); // shard en haut du puits

  return build(past, future);
}

/** Les 4 niveaux du chapitre 2, dans l'ordre. */
export const CHAPTER2: readonly LevelData[] = [
  level2_1(),
  level2_2(),
  level2_3(),
  level2_4(),
];
