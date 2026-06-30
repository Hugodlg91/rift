import { GridBuilder, build } from './builder';
import type { LevelData } from '../types';

/**
 * CHAPITRE 1 — LES RUINES.  Capacités : switch (F) + double saut.
 * Hazard signature : les fosses (chute = mort). Aucun pic/laser ici.
 * Refonte orientée "Kishōtenketsu" (4 temps) avec rythme et verticalité.
 */

const H = 14;
const STAND = 11;

/** Creuse une fosse (vide jusqu'à l'abîme). */
function pit(g: GridBuilder, x: number, len: number): void {
  g.clearCol(x, len, H - 2);
}

// ---------------------------------------------------------------------------
// 1-1 — ENSEIGNER
// ---------------------------------------------------------------------------
// Intro douce. Escalade simple, saut au-dessus d'une fosse.
// Le mur de phase est placé sur un sol ferme pour enseigner le switch sans stress.
function level1_1(): LevelData {
  const W = 52;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // 1. Apprendre à sauter sur une plateforme
  base.rect(8, 9, 4, 5, '#'); // marche 1
  base.rect(12, 7, 4, 7, '#'); // marche 2

  // 2. Fosse d'apprentissage (sécurisée car on tombe de haut vers bas)
  pit(base, 16, 3);
  base.rect(19, STAND, 6, 3, '#'); // atterrissage en contrebas

  // 3. Mur de phase bloquant le passage sur un sol sûr
  base.rect(25, 9, 8, 5, '#');
  base.set(36, STAND, 'P'); // Checkpoint

  pit(base, 40, 3); // Dernière fosse pour tester avant la fin

  const past = base.clone();
  past.set(13, 5, 'o'); // Shard sur la marche 2
  past.vLine(30, 1, 8, '#'); // Mur de phase PASSÉ sur la plateforme x=25

  const future = base.clone();
  future.set(44, 8, 'o'); // Shard de fin

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 1-2 — TESTER
// ---------------------------------------------------------------------------
// Développement du double saut et des pierres de gué.
function level1_2(): LevelData {
  const W = 60;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // 1. Grand vide nécessitant le double saut
  base.rect(6, 8, 4, 6, '#');
  pit(base, 10, 6); // fosse de 6 de large
  base.rect(16, 8, 4, 6, '#');
  base.set(21, STAND, 'P');

  // 2. Énigme de la fosse et des pierres de gué
  pit(base, 25, 12);
  base.rect(37, 7, 8, 7, '#'); // arrivée en hauteur

  // 3. Plateforme one-way pour redescendre
  base.hLine(48, 7, 4, '=');
  base.set(51, STAND, 'P'); // check 2 avant la fin

  const past = base.clone();
  past.vLine(31, 1, 13, '#'); // Grand mur au milieu de la fosse, force à chercher une alternative

  const future = base.clone();
  future.vLine(31, 1, 13, '.'); // Ouvre le mur
  // Pierres de gué pour traverser le vide immense
  future.set(27, 8, '#');
  future.set(33, 6, '#');
  future.set(49, 5, 'o'); // Shard au-dessus du one-way

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 1-3 — TWISTER
// ---------------------------------------------------------------------------
// Le couloir de switch en version "zigzag vertical".
// On doit switcher tout en montant des plateformes.
function level1_3(): LevelData {
  const W = 58;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  // Structure en escalier fermée par des murs
  base.rect(8, 8, 6, 6, '#');
  base.rect(18, 5, 6, 9, '#');
  base.rect(28, 2, 6, 12, '#');
  base.set(38, STAND, 'P');
  
  pit(base, 42, 5); // Fosse terminale

  const past = base.clone();
  past.vLine(14, 1, 11, '#'); // bloque l'accès à la plateforme 1
  past.vLine(24, 1, 11, '#'); // bloque l'accès à la plateforme 2
  past.set(20, 3, 'o');

  const future = base.clone();
  future.vLine(11, 1, 7, '#'); // bloque le saut sur la plateforme 1
  future.vLine(21, 1, 4, '#'); // bloque le saut sur la plateforme 2
  future.vLine(34, 1, 11, '#'); // bloque la redescente
  future.set(44, 7, 'o');

  return build(past, future);
}

// ---------------------------------------------------------------------------
// 1-4 — INTÉGRER
// ---------------------------------------------------------------------------
// Le grand final : switch en plein vol, grandes hauteurs.
function level1_4(): LevelData {
  const W = 76;
  const base = new GridBuilder(W, H).frame();
  base.set(2, STAND, 'S');
  base.set(W - 3, STAND, 'E');

  base.rect(8, 9, 3, 5, '#');
  pit(base, 11, 4);
  base.rect(15, 7, 4, 7, '#');
  base.set(21, STAND, 'P');

  // Grand gouffre avec switch en l'air obligatoire
  pit(base, 25, 10);
  base.rect(35, 9, 5, 5, '#');
  
  base.set(42, STAND, 'P');

  // Montée monumentale
  base.rect(48, 8, 3, 6, '#');
  base.rect(54, 5, 3, 9, '#');
  base.hLine(60, 5, 3, '='); // redescendre
  pit(base, 66, 4);

  const past = base.clone();
  past.vLine(30, 1, 13, '#'); // Mur au milieu du grand gouffre
  past.set(16, 5, 'o');
  past.set(61, 3, 'o');

  const future = base.clone();
  future.set(51, 6, '#'); // pierre de gué pour la grande montée

  return build(past, future);
}

/** Les 4 niveaux du chapitre 1, dans l'ordre. */
export const CHAPTER1: readonly LevelData[] = [
  level1_1(),
  level1_2(),
  level1_3(),
  level1_4(),
];
