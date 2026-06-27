# RIFT — Journal de progression

> Suivi en temps réel de l'implémentation du MVP (voir [DEVLOG.md](DEVLOG.md) pour le cahier des charges).
> Mis à jour au fur et à mesure que les tâches sont terminées.

**Session démarrée :** 2026-06-08
**Statut global :** 🟢 MVP + v2 Phases A (game feel), B (direction artistique), C (audio) & D (caméra & niveaux élaborés) — typecheck + build OK

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

## 🎨 v2 — Phase B : Direction artistique (terminée, en attente de review)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §1-2. Voir [STYLE.md](STYLE.md).

- [x] **`PALETTE`** — rampes 4 tons par monde + hue-shifting ; `WORLDS` en dérive (source de vérité couleur unique)
- [x] **Tiles 3 tons + variantes** — biseau lumière/ombre, 3 variantes aléatoires/monde (fissures PASSÉ, circuits FUTUR), tiles de **bord** (liseré d'accent) vs **intérieures** (choix auto selon le tile au-dessus)
- [x] **Parallax 3 couches/monde** (`ParallaxBackground.ts`) — silhouettes procédurales (ruines/skyline), scrollFactor 0.1/0.3/0.6, **cross-fade au switch**
- [x] **Vignette** — texture canvas radiale, overlay plein écran
- [x] **Glow sorties** — halo additif (`BlendMode.ADD`) teinté par monde, pulsé
- [x] **Particules d'ambiance** (`Atmosphere.ts`) — cendres qui tombent (PASSÉ) / data-motes qui montent (FUTUR, additif)
- [x] **Light wash** — calque `BlendMode.OVERLAY` plein écran, teinté par monde
- [x] **Liseré d'accent joueur** — rim glow `postFX` qui prend la couleur du monde courant
- [x] **`STYLE.md`** — guide de style (§1.4)
- [x] `tsc --noEmit` ✓ · `npm run build` ✓

**Détail technique :** nouveaux modules `objects/ParallaxBackground.ts` et `objects/Atmosphere.ts` ;
textures générées en plus au boot (8 tiles, 6 parallax, vignette, glow) ; `GameScene.onWorldData`
orchestre le cross-fade (parallax + wash + ambiance + accent joueur + teinte du glow de sortie).
Le rim glow joueur utilise `postFX` (WebGL ; no-op gracieux en Canvas).

> ⏳ **À valider en navigateur** : rendu WebGL (glow/FX), lisibilité avec vignette + wash, perf des
> particules, cohérence du cross-fade parallax avec le flash de switch existant.

---

## 🔊 v2 — Phase C : Audio procédural (terminée, en attente de review)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §8. Synthèse Web Audio, **zéro fichier**.

- [x] **`audio/Sfx.ts`** — AudioContext + **GainNode master** + helpers de synthèse (oscillateurs/bruit + enveloppes + filtres). SFX §8.1 : saut, double saut, atterrissage, switch monde (2 tons selon sens + glitch), switch refusé (buzz dissonant), mort, sortie **(câblés)** ; dash, collectible, checkpoint **(exposés, non câblés)**.
- [x] **`audio/Ambience.ts`** — drone par monde (stack d'oscillateurs basse fréquence + LFO lent + filtre), **morph au switch** : PASSÉ triangle chaud/feutré (lowpass 420 Hz), FUTUR saw froid/métallique (filtre résonant 780 Hz).
- [x] **Mute touche `M`** (master gain → 0, en mémoire de session, **pas de localStorage**).
- [x] **Resume sur 1er input** (politique navigateur) : `keydown` du menu réveille l'AudioContext.
- [x] **Câblage** sur évènements existants : `jump`/`doubleJump`, `land`, `rift-switch`/`rift-denied`, `death`, `exit`. Drone démarré/arrêté avec la GameScene, morph via `changedata-world`.
- [x] `tsc --noEmit` ✓ · `npm run build` ✓

**Détail technique :** `Sfx` est un singleton (un seul AudioContext), `Ambience` route via le master de `Sfx`
(donc le mute couvre tout). Nouveaux évènements `rift-switch`/`rift-denied` émis par `WorldManager`
(distincts de `changedata-world` qui fire aussi au respawn → pas de son de switch au respawn).
Player émet `jump(air:boolean)`. Pas d'évènement inventé pour dash/collectible/checkpoint (fonctions prêtes, à câbler en Phase E/F).

- [x] **Vérifié en navigateur** (instrumentation Web Audio) : AudioContext `running` (master 0.35 → compressor → destination), drone = 5 oscillateurs au lancement, `jump` = 1 SFX, switch = 3 oscillateurs (2 tons + glitch), mute `M` = master → 0 → 0.35, aucun son au repos.
- [x] **Fix glitch trouvé en vérif** : le SFX `land` se redéclenchait ~40×/atterrissage (micro-rebond au sol → `onGround` flickere → bord de landing re-déclenché). Corrigé par un seuil de temps de vol (`FEEL.LAND_MIN_AIR_MS`) ⇒ **un contact = un seul atterrissage** (corrige aussi poussière/squash).

---

## 🎥 v2 — Phase D : Caméra & niveaux élaborés (terminée, en attente de review)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §6.3-6.5, §10.

- [x] **Caméra** `startFollow` + **deadzone** (`CAMERA.DEADZONE_*`) + **lookahead** (offset eased dans le sens du déplacement). Bloc `CAMERA` exposé dans `constants.ts`.
- [x] **Parallax compatible scroll** — `ParallaxBackground` passé en **`TileSprite`** plein-viewport (`scrollFactor 0`) ; `update(camera)` règle `tilePositionX/Y = scrollX/Y × facteur` ⇒ couverture garantie quelle que soit la largeur, cross-fade conservé.
- [x] **Format multi-écrans** — authoring **ASCII** (`levels/parse.ts` : `makeLevel`/`parseGrid`, tokens `# . S E P`). level1 (46), level2 (50), level3 (54) **réécrits** en ~2 écrans, hauteur 1 écran (scroll horizontal). `validateLevel` étendu au checkpoint `P`, `validateAllLevels()` au boot en dev.
- [x] **Checkpoints** (`P`) — pilier dormant qui **s'illumine** + `getSfx().checkpoint()` à l'activation ; `Player.setCheckpoint` déplace le point de respawn ⇒ mort = retour au dernier checkpoint.
- [x] **Écran inter-niveau** — `InterLevelScene` (niveau franchi + morts, `ENTRÉE/ESPACE` pour continuer) intercalé par `onReachExit` ; le dernier niveau va direct à l'écran de fin.
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas déterministe, onglet preview masqué = rAF gelé) : boot→menu→jeu sans exception ; level1 = 1472 px / level2 = 1600 px (multi-écrans) ; `scrollX` 0→443 (max 672), `followOffset` −96 ; parallax suit (loin ≈44, près ≈265) ; mur PASSÉ bloque, switch ouvre ; checkpoint activé → respawn au checkpoint (x688, pas x80) ; sortie → `InterLevelScene` → niveau 2.

> ⏳ **À valider à la main** : ressenti caméra (lerp/deadzone/lookahead), lisibilité du parallax en scroll, design/jouabilité des 3 niveaux élargis.

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
