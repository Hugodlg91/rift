# RIFT — Journal de progression

> Suivi en temps réel de l'implémentation du MVP (voir [DEVLOG.md](DEVLOG.md) pour le cahier des charges).
> Mis à jour au fur et à mesure que les tâches sont terminées.

**Session démarrée :** 2026-06-08
**Statut global :** 🟢 MVP implémenté — typecheck + build OK

---

## ✅ Tâches accomplies

- [x] **Setup config projet** — `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `README.md`
- [x] **Dépendances installées** — Phaser 3.90, TypeScript 5.9, Vite 6.4
- [x] **`src/constants.ts` + `src/types.ts`** — couleurs des mondes, physique joueur, clés textures/scènes, interfaces
- [x] **`src/scenes/BootScene.ts`** — génération programmatique des textures (tiles passé/futur, joueur, portails de sortie)
- [x] **`src/objects/Player.ts`** — déplacement, double saut (1 saut aérien), cycle mort/respawn
- [x] **`src/objects/WorldManager.ts`** — switch PASSÉ↔FUTUR, check anti-crush (AABB), cooldown, flash/shake/tween de fond
- [x] **`src/levels/`** — `level1` (verbatim DEVLOG) + `level2`/`level3` (murs de phase + fosses mortelles) + `index.ts` avec validation (dimensions + cohérence spawn/sortie vérifiées ✓)
- [x] **`src/scenes/GameScene.ts`** — construction du niveau, collisions par monde, exit/mort, enchaînement des niveaux, bords du monde (chute = mort)
- [x] **`src/scenes/MenuScene.ts`** — écran titre split PASSÉ/FUTUR + glitch
- [x] **`src/scenes/UIScene.ts`** — HUD overlay (monde courant, niveau, morts) piloté par le registry
- [x] **`src/scenes/EndScene.ts`** — écran de fin (victoire + compteur de morts)
- [x] **`src/main.ts`** — point d'entrée + config Phaser (FIT, gravité, scènes)
- [x] **Vérification** — `tsc --noEmit` ✓ · `npm run build` ✓ · dev server démarre sur :5173 ✓

## 🚧 Reste à faire

- [ ] **Commit** — implémentation MVP
- [ ] **Test manuel navigateur** — jouabilité (non vérifiable headless ici ; à faire via `npm run dev`)

---

## 🎯 Critères de validation MVP

| Critère | Statut |
|---|---|
| Lancement sur `localhost:5173` sans erreur (serveur + build) | ✅ vérifié (build + dev server) |
| Déplacement + saut | ✅ implémenté |
| `F` switche le monde avec effet visuel | ✅ implémenté |
| Tiles du monde inactif masquées | ✅ implémenté |
| Switch bloqué si écrasement (AABB) | ✅ implémenté |
| Chute hors niveau → respawn | ✅ implémenté |
| Sortie atteinte → niveau suivant | ✅ implémenté |
| Après niveau 3 → écran de fin | ✅ implémenté |
| HUD affiche le monde courant | ✅ implémenté |

> ⏳ Les ✅ « implémenté » restent à confirmer par un passage manuel dans le navigateur (`npm run dev`).

---

## 📝 Notes pour la prochaine session

- **Niveaux 2 & 3** : conçus autour de « murs de phase » pleine hauteur (infranchissables dans un monde, ouverts dans l'autre) → switch obligatoire. Fosses mortelles ouvertes jusqu'en bas pour la mort par chute. Solutions documentées en tête de `level2.ts` / `level3.ts`.
- **Déviation au cahier des charges** : ajout d'une `EndScene` (non listée dans l'arborescence d'origine) pour satisfaire « écran de fin » des critères MVP.
- **Bundle** : ~1.5 Mo (Phaser complet). Post-MVP : envisager un build custom Phaser ou du code-splitting.
- **Post-MVP** (cf. DEVLOG) : ennemis, audio, Tiled, timer speedrun, publication itch.io. Créer `DEVLOG_NEXT.md` le moment venu.
