import { GridBuilder, build } from './builder';
import type { LevelData } from '../types';

/**
 * CHAPITRE 1 — LES RUINES.  Capacités : switch (F) + double saut.
 * Hazard signature : les fosses (chute = mort). Aucun pic/laser ici (réservés
 * au ch.2) : la difficulté vient de la lecture des deux mondes, pas du danger.
 *
 * Méthode Nintendo enseigner → tester → twister → intégrer :
 *   1-1 ENSEIGNER  — bouger, sauter, et le tout premier mur de phase.
 *   1-2 TESTER     — un grand vide qui exige le double saut + un passage qui
 *                    n'existe qu'au FUTUR (pierres de gué).
 *   1-3 TWISTER    — couloir de murs alternés : on switche en boucle (respiration).
 *   1-4 INTÉGRER   — long parcours : fosses, murs de phase, plateforme one-way,
 *                    double saut sous checkpoint, et deux énigmes de switch.
 *
 * Repères de calibrage (constants.ts) : saut ≈ 4–5 tuiles de haut, ~5 de portée ;
 * double saut ≈ 8–9 de portée ; sol = lignes 12-13, le joueur tient sur la ligne 11.
 */

const H = 14;
const STAND = 11; // ligne où posent S / E / P (juste au-dessus du sol)

/** Creuse une fosse (vide jusqu'à l'abîme) : enlève le sol sur `len` colonnes. */
function pit(g: GridBuilder, x: number, len: number): void {
  for (let i = 0; i < len; i++) {
    g.set(x + i, H - 2, '.');
    g.set(x + i, H - 1, '.');
  }
}

// ---------------------------------------------------------------------------
// 1-1 — ENSEIGNER
// ---------------------------------------------------------------------------
// Solution : avancer, hop sur la marche (x8), franchir la petite fosse (x13-15),
// monter sur la corniche (x19-21) pour le shard, puis au mur de phase PASSÉ (x28)
// presser F → le FUTUR est ouvert → traverser, dernière fosse (x33-34) → sortie.
function level1_1(): LevelData {
  const W = 42;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x39
  base.set(8, STAND, '#'); // marche d'apprentissage
  pit(base, 13, 3); // petite fosse — un saut simple
  base.hLine(19, 9, 3, '#'); // corniche
  pit(base, 33, 2); // dernière fosse

  const past = base.clone();
  past.set(20, 7, 'o'); // shard au-dessus de la corniche
  past.vLine(28, 1, 11, '#'); // MUR DE PHASE (PASSÉ uniquement)

  const future = base.clone(); // au FUTUR le passage est libre

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 1-2 — TESTER
// ---------------------------------------------------------------------------
// Solution : grand vide (x10-16) = double saut obligatoire → checkpoint (x20).
// Énigme : au PASSÉ un mur (x30) barre la fosse (x26-33) ; switch FUTUR → des
// pierres de gué (x28, x31) apparaissent → traverser. Fin : sauter à travers la
// plateforme one-way (x42) par en dessous pour cueillir le shard au-dessus.
function level1_2(): LevelData {
  const W = 50;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x47
  pit(base, 10, 7); // grand vide — double saut
  base.set(20, STAND, 'P'); // checkpoint
  pit(base, 26, 8); // fosse de l'énigme de switch
  base.set(42, 9, '='); // plateforme one-way

  const past = base.clone();
  past.vLine(30, 1, 11, '#'); // mur PASSÉ au milieu de la fosse

  const future = base.clone();
  future.set(28, 10, '#'); // pierres de gué (FUTUR)
  future.set(31, 10, '#');
  future.set(42, 7, 'o'); // shard au-dessus du one-way

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 1-3 — TWISTER  (respiration : pas de fosse mortelle avant la toute fin)
// ---------------------------------------------------------------------------
// Solution : couloir de murs alternés. Départ PASSÉ → mur PASSÉ (x12) : F→FUTUR
// (shard à x16) → mur FUTUR (x20) : F→PASSÉ (shard sur la corniche x24-26) →
// mur PASSÉ (x28) : F→FUTUR → mur FUTUR (x36) : F→PASSÉ → petit vide (x45-48) → sortie.
// Le sol est plein dans les deux mondes : switcher ne fait jamais tomber.
function level1_3(): LevelData {
  const W = 54;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x51
  base.hLine(24, 9, 3, '#'); // corniche centrale (rythme + shard)
  base.set(30, STAND, 'P'); // checkpoint
  pit(base, 45, 4); // unique fosse, juste avant la sortie

  const past = base.clone();
  past.vLine(12, 1, 11, '#'); // murs PASSÉ
  past.vLine(28, 1, 11, '#');
  past.set(25, 7, 'o'); // shard sur la corniche (visible quand on est au PASSÉ)

  const future = base.clone();
  future.vLine(20, 1, 11, '#'); // murs FUTUR
  future.vLine(36, 1, 11, '#');
  future.set(16, 10, 'o'); // shard du couloir FUTUR

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 1-4 — INTÉGRER
// ---------------------------------------------------------------------------
// Solution : fosse (x10-12). Mur PASSÉ (x17) → FUTUR : pierre de gué (x20) sur la
// fosse (x18-22). Montée de marches (x26/29/32) + one-way (x35) pour redescendre ;
// shard PASSÉ caché à x29 (switch sur une marche). Checkpoint (x37) puis GRAND
// vide (x40-46) = double saut. Énigme finale : au FUTUR un mur (x55) barre la
// fosse (x54-58) ; switch PASSÉ → pierre de gué (x56) → sortie.
function level1_4(): LevelData {
  const W = 66;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E'); // x63
  base.set(7, STAND, '#'); // marche
  pit(base, 10, 3); // fosse simple
  pit(base, 18, 5); // fosse de l'énigme seg.2
  base.set(26, 10, '#'); // montée
  base.set(29, 9, '#');
  base.set(32, 9, '#');
  base.set(35, 9, '='); // one-way pour redescendre
  base.set(37, STAND, 'P'); // checkpoint avant le grand vide
  pit(base, 40, 7); // GRAND vide — double saut
  pit(base, 54, 5); // fosse de l'énigme finale

  const past = base.clone();
  past.vLine(17, 1, 11, '#'); // mur PASSÉ (force le FUTUR en seg.2)
  past.set(29, 7, 'o'); // shard de la montée
  past.set(56, 10, '#'); // pierre de gué de l'énigme finale (PASSÉ)
  past.set(56, 8, 'o'); // shard au-dessus

  const future = base.clone();
  future.set(20, 10, '#'); // pierre de gué seg.2 (FUTUR)
  future.set(20, 8, 'o'); // shard au-dessus
  future.vLine(55, 1, 11, '#'); // mur FUTUR (force le PASSÉ en fin)

  return build(past, future);
}

/** Les 4 niveaux du chapitre 1, dans l'ordre. */
export const CHAPTER1: readonly LevelData[] = [
  level1_1(),
  level1_2(),
  level1_3(),
  level1_4(),
];
