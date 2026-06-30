import { GridBuilder, build } from './builder';
import type { LevelData } from '../types';

/**
 * CHAPITRE 3 — TEMPS PROFOND. Capacités : switch + double saut + dash + wall jump + ECHO.
 * Hazards / Éléments : Plateformes effondrables (C), Boutons (B), Portes (D).
 * L'Echo permet de créer une plateforme solide temporaire à ses pieds lors d'un switch.
 */

const H = 14;
const STAND = 11;

function pit(g: GridBuilder, x: number, len: number): void {
  g.clearCol(x, len, H - 2);
}

// ---------------------------------------------------------------------------
// 3-1 — ENSEIGNER (Echo + Plateformes effondrables)
// ---------------------------------------------------------------------------
function level3_1(): LevelData {
  const W = 52;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // 2. Fosse (sans pics volants au fond)
  pit(base, 14, 6);
  
  base.set(22, STAND, 'P');

  // 3. Le mur infranchissable : nécessite de sauter en l'air, switcher (créer un Echo), 
  // atterrir sur l'Echo, et resauter pour passer par-dessus.
  base.rect(28, 5, 4, 9, '#'); 
  
  pit(base, 32, 5); // Fosse derrière le mur
  base.rect(37, 9, 6, 5, '#'); // Zone d'atterrissage
  
  const past = base.clone();
  // Les plateformes effondrables n'existent que dans les ruines (PASSÉ)
  past.hLine(8, 9, 4, 'C'); 
  past.hLine(15, 8, 4, 'C');
  past.set(39, 7, 'o'); // Shard
  
  const future = base.clone();

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 3-2 — TESTER (Echo + Wall Jump + Dash)
// ---------------------------------------------------------------------------
// Utiliser l'Echo comme relais au-dessus du grand vide.
function level3_2(): LevelData {
  const W = 62;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  base.rect(6, 7, 4, 7, '#');
  base.set(8, 6, 'P');

  // Immense gouffre (mort immédiate, pas de pics flottants)
  pit(base, 10, 22);
  
  base.rect(32, 7, 4, 7, '#');
  base.set(34, 6, 'P');

  // Faisons un long tunnel de pics avec des effondrables au plafond.
  // On met un vrai sol à y=12 pour soutenir les pics (y=11)
  pit(base, 38, 16);
  base.hLine(38, 12, 16, '#');
  base.hLine(38, 11, 16, '^'); 

  const past = base.clone();
  // Les plafonds effondrables ne sont que dans le PASSÉ
  past.hLine(42, 6, 2, 'C');
  past.hLine(48, 8, 2, 'C');
  past.set(43, 4, 'o');
  
  const future = base.clone();

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 3-3 — TWISTER (Boutons et Portes)
// ---------------------------------------------------------------------------
// Enseigner les B et D.
function level3_3(): LevelData {
  const W = 66;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // 1. Bouton basique
  base.set(10, STAND, 'B'); 
  base.vLine(15, 1, 11, 'D'); // Porte qui bloque le chemin
  
  base.set(18, STAND, 'P');

  // 2. Bouton en hauteur, inaccessible sans Echo
  base.rect(26, 4, 4, 10, '#'); // Pilier massif
  pit(base, 30, 4);
  
  // Il faut utiliser un Echo pour grimper sur le pilier de x=26.
  
  // 3. Porte 2
  base.vLine(38, 1, 11, 'D');

  const past = base.clone();
  past.set(28, 3, 'B'); // Le bouton est dans le PASSÉ, sur le pilier.
  past.set(31, 7, 'o');
  
  const future = base.clone();

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 3-4 — INTÉGRER (Le Temple)
// ---------------------------------------------------------------------------
// Mix maximal : Echo au-dessus des pics, portes de mondes différents, effondrables.
function level3_4(): LevelData {
  const W = 76;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // Montée initiale
  base.rect(14, 4, 4, 10, '#');
  base.set(16, 3, 'P');

  // Grande salle (sans pics flottants au fond)
  pit(base, 18, 30);
  
  // Des portes suspendues dans le vide. Le joueur doit ouvrir la voie 
  // puis utiliser des Echos pour traverser.
  base.rect(48, 8, 4, 6, '#');
  base.set(50, 7, 'P');

  // Boutons pour ouvrir les portes
  base.rect(56, 10, 2, 4, '#');
  base.rect(62, 6, 2, 8, '#');

  const past = base.clone();
  // Les effondrables de la montée initiale ne sont que dans le PASSÉ
  past.hLine(6, 9, 2, 'C');
  past.hLine(10, 6, 2, 'C');
  // Porte PASSÉ dans la grande salle
  past.vLine(26, 1, 13, 'D');
  past.set(57, 9, 'B'); // Bouton pour la porte PASSÉ
  past.set(36, 6, 'o');

  const future = base.clone();
  // Porte FUTUR
  future.vLine(36, 1, 13, 'D');
  future.set(63, 5, 'B'); // Bouton pour la porte FUTUR
  future.set(26, 6, 'o');

  return build(past, future);
}

/** Les 4 niveaux du chapitre 3, dans l'ordre. */
export const CHAPTER3: readonly LevelData[] = [
  level3_1(),
  level3_2(),
  level3_3(),
  level3_4(),
];
