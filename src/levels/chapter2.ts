import { GridBuilder, build } from './builder';
import type { LevelData } from '../types';

/**
 * CHAPITRE 2 — LA FRACTURE. Capacités : switch + double saut + DASH + SAUT MURAL.
 * Niveaux repensés pour offrir plus de verticalité et de variété visuelle.
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

/** Pics/lasers au sol. */
function spikes(g: GridBuilder, x: number, len: number, y: number = STAND): void {
  for (let i = 0; i < len; i++) g.set(x + i, y, '^');
}

// ---------------------------------------------------------------------------
// 2-1 — ENSEIGNER le dash (variante colline)
// ---------------------------------------------------------------------------
// Solution : on monte la colline, plafond très bas au sommet → impossible de
// sauter au-dessus du pic, il faut dasher. On redescend, checkpoint, fosse
// (double saut) puis mur de phase PASSÉ.
function level2_1(): LevelData {
  const W = 48;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // Colline
  base.rect(8, 9, 3, 5, '#');
  base.rect(11, 7, 3, 7, '#');
  base.rect(14, 5, 8, 9, '#'); // sommet de la colline à y=5

  // Plafond bas pour forcer le dash
  base.hLine(16, 3, 5, '#'); // plafond à y=3
  spikes(base, 18, 1, 4); // pic à y=4 (1 tuile de passage)

  // Descente
  base.rect(22, 7, 3, 7, '#');
  base.rect(25, 9, 3, 5, '#');

  base.set(29, STAND, 'P'); // checkpoint
  pit(base, 34, 4); // fosse

  const past = base.clone();
  past.vLine(42, 1, 11, '#'); // mur de phase PASSÉ
  past.set(29, 7, 'o'); // shard au dessus du checkpoint

  const future = base.clone();
  future.set(40, 8, 'o');

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-2 — ENSEIGNER le saut mural (variante gouffre)
// ---------------------------------------------------------------------------
// Solution : on démarre en hauteur, on tombe dans un trou. Pour remonter, on
// utilise un saut mural entre la paroi suspendue (x=14) et la corniche (x=17).
// Dash sous plafond bas (x=19/21). Checkpoint, grande fosse double saut,
// mur de phase PASSÉ à la fin.
function level2_2(): LevelData {
  const W = 52;
  const base = new GridBuilder(W, H).frame();
  
  // Promontoire de départ
  base.rect(0, 6, 8, 8, '#');
  base.set(2, 5, 'S');
  base.set(W - 3, STAND, 'E');

  // Le gouffre se situe naturellement après x=7 (jusqu'au fond STAND=11)
  
  // Paroi suspendue gauche du saut mural
  base.vLine(14, 4, 7, '#');
  
  // Paroi droite du saut mural (corniche)
  base.rect(17, 4, 8, 10, '#'); 
  
  // Sur la corniche, plafond bas et pic
  base.hLine(19, 2, 4, '#'); // plafond y=2
  spikes(base, 21, 1, 3); // pic y=3
  
  // On retombe au sol
  base.set(29, STAND, 'P');
  pit(base, 34, 5); // fosse

  const past = base.clone();
  past.vLine(46, 1, 11, '#'); // mur de phase PASSÉ
  past.set(15, 2, 'o'); // shard en l'air dans la zone de saut mural
  
  const future = base.clone();
  future.set(40, 8, 'o');

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-3 — TWISTER (dash + switch + mobile + cheminée suspendue)
// ---------------------------------------------------------------------------
// Solution : petite plateforme avec plafond bas → dash. Fosse avec double saut.
// Grande structure centrale (x=26..36) avec une "cheminée" de saut mural. 
// Fosse traversée via plateforme mobile (FUTUR). Mur de phase.
function level2_3(): LevelData {
  const W = 62;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');
  
  // Petit promontoire à dash
  base.rect(6, 8, 4, 6, '#'); // y=8
  base.hLine(6, 6, 4, '#'); // plafond y=6
  spikes(base, 7, 1, 7); // pic y=7
  
  pit(base, 12, 6); // fosse 1
  base.set(20, STAND, 'P');
  
  // Structure centrale : saut mural suspendu
  base.rect(26, 6, 4, 8, '#');
  base.rect(33, 6, 4, 8, '#');
  // Plafond au-dessus de la cheminée pour éviter qu'on passe par-dessus
  base.hLine(27, 2, 2, '#');
  
  pit(base, 42, 6); // fosse 2 (franchie en mobile)

  const past = base.clone();
  past.vLine(54, 1, 11, '#'); // mur de phase PASSÉ
  past.set(31, 3, 'o'); // shard dans la cheminée
  
  const future = base.clone();
  future.set(14, STAND - 1, 'M'); // plateforme mobile fosse 1
  future.set(44, STAND - 1, 'M'); // plateforme mobile fosse 2
  future.set(50, 8, 'o');

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 2-4 — INTÉGRER (complexe abandonné)
// ---------------------------------------------------------------------------
// Solution : Parcours accidenté. Start en hauteur. Fosse. Mur escalade.
// Dash sous plafond. Double saut au-dessus de fosse.
// Zone complexe avec plateforme mobile + saut mural sur une tour.
// Mur de phase et pierre de gué.
function level2_4(): LevelData {
  const W = 76;
  const base = new GridBuilder(W, H).frame();
  
  // Départ très surélevé
  base.rect(0, 8, 10, 6, '#'); // y=8
  base.set(2, 7, 'S');
  base.set(W - 3, STAND, 'E');
  
  pit(base, 10, 4); // fosse sous le départ
  
  // Corniche haute avec dash
  base.rect(14, 5, 6, 9, '#'); // y=5
  base.hLine(15, 3, 4, '#'); // plafond y=3
  spikes(base, 16, 1, 4); // pic y=4
  
  // On atterrit en bas
  base.set(22, STAND, 'P'); // check 1
  pit(base, 26, 6); // fosse à franchir en mobile
  
  // Tour
  base.rect(36, 6, 6, 8, '#');
  base.vLine(35, 2, 6, '#'); // paroi de saut mural à gauche de la tour
  
  base.set(44, STAND, 'P'); // check 2
  pit(base, 48, 8); // grand vide double saut
  
  // Dernière corniche avec dash
  base.hLine(62, 9, 5, '#'); // plafond bas y=9
  base.hLine(64, 11, 2, '#'); // sol sous les pics
  spikes(base, 64, 1, 10); // pic y=10, soutenu par le sol y=11
  
  const past = base.clone();
  past.vLine(70, 1, 11, '#'); // mur de phase PASSÉ (fin)
  past.set(38, 4, 'o');
  
  const future = base.clone();
  future.set(28, STAND - 1, 'M'); // mobile dans le FUTUR uniquement
  future.set(52, 8, 'o'); // shard grand vide
  // Mur de phase au milieu du saut mural de la tour (force le switch)
  future.vLine(35, 2, 6, '.'); // la paroi disparait dans le futur !
  
  return build(past, future);
}

/** Les 4 niveaux du chapitre 2, dans l'ordre. */
export const CHAPTER2: readonly LevelData[] = [
  level2_1(),
  level2_2(),
  level2_3(),
  level2_4(),
];
