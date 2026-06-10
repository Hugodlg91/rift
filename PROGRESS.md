# RIFT — Journal de progression

> Suivi en temps réel de l'implémentation du MVP (voir [DEVLOG.md](DEVLOG.md) pour le cahier des charges).
> Mis à jour au fur et à mesure que les tâches sont terminées.

**Session démarrée :** 2026-06-08
**Statut global :** 🟢 MVP + v2 Phase A (game feel) implémentés — typecheck + build OK

---

## 🚀 v2 — Phase A : Game feel (terminée, en attente de review)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §4, §3.2-3.3, §10. **Aucun nouveau contenu** — uniquement le ressenti de `Player.ts`.

- [x] **Objet `FEEL`** exposé dans `constants.ts` (tous les réglages de juice centralisés)
- [x] **Accélération / friction** — plus de vitesse instantanée ; contrôle aérien réduit (`AIR_CONTROL`)
- [x] **Coyote time** (100 ms) — saut toléré après avoir quitté le rebord
- [x] **Jump buffering** (120 ms) — appui mémorisé juste avant l'atterrissage
- [x] **Variable jump height** — relâcher coupe l'ascension à 40 %
- [x] **Apex hang** (×0.6) + **fast fall** (×1.3) — gravité modulée par frame
- [x] **Corner correction** (±4 px) — glisse sur le coin d'un plafond en montant
- [x] **Squash & stretch procédural** — ressort qui revient à 1 (saut/apex/atterrissage), sans conflit de tweens
- [x] **Poussière** — course (~200 ms), demi-tour (skid), atterrissage (burst ∝ vitesse de chute) + texture `dust` générée au boot
- [x] **Shake mesuré à l'atterrissage** — seulement sur les grosses chutes (modèle Celeste)
- [x] `tsc --noEmit` ✓ · `npm run build` ✓

**Détail technique :** `Player.update(delta)` reçoit maintenant le delta depuis `GameScene` ;
gravité ajustée via `body.setGravityY(offset)` ; nudge de corner correction via `overlapRect` +
`body.position` ; squash géré en spring (`Phaser.Math.Linear`) plutôt qu'en tweens pour éviter
les conflits avec l'animation de mort.

> ⏳ **À valider en review / navigateur** : ressenti des sauts, lisibilité des effets, non-régression
> de la mécanique de switch et du cycle mort/respawn.

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
