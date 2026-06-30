# RIFT — Journal de progression

> Suivi en temps réel de l'implémentation du MVP (voir [DEVLOG.md](DEVLOG.md) pour le cahier des charges).
> Mis à jour au fur et à mesure que les tâches sont terminées.

**Session démarrée :** 2026-06-08
**Statut global :** 🟢 MVP + v2 Phases A→F + Phase G (framework 12 niveaux/3 chapitres + DA par chapitre + **Chapitre 1 « LES RUINES »** & **Chapitre 2 « LA FRACTURE »** : 8 niveaux from scratch) — typecheck + build OK

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

## ⚡ v2 — Phase E : Capacités débloquées + hazards (terminée, en attente de review)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §5.

- [x] **Système de capacités** — `Ability` + `LevelMeta` (`types.ts`) ; chaque niveau déclare `abilities[]` + `introduces`. `Player.setAbilities` gate le double saut, `WorldManager.setSwitchEnabled` gate le switch. *(level1 = switch+saut ; level2 +dash ; level3 +saut mural — assignation provisoire, l'agencement final des 12 niveaux viendra en Phase G.)*
- [x] **Dash** (`MAJ`) — burst horizontal (`DASH`), i-frames vs hazards pendant le dash, after-images teintées, cooldown réinitialisé au sol.
- [x] **Wall slide + wall jump** (`WALL`) — chute plaquée au mur ralentie (95 px/s) + saut en rebond qui pousse à l'opposé avec lockout d'input bref.
- [x] **Tutoriels contextuels** — overlay HUD discret (`UIScene`, registry `tutorial`) au spawn quand le niveau `introduces` une capacité, masqué à la 1ʳᵉ utilisation.
- [x] **Hazards de base** — `^` (piques PASSÉ / laser FUTUR, mort au contact), `=` (one-way), `M` (`MovingPlatform` : va-et-vient horizontal + portage du joueur). Par monde, togglés au switch ; textures au boot.
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas) : dash gated lvl1 / actif lvl2 (burst 112 px, tuto qui se masque) ; wall slide vy=95 + wall jump vx=−250 ; piques tuent + toggle par monde (PASSÉ : 3 one-way ; FUTUR : pique+mobile) ; mobile qui avance ; 3 niveaux sans exception.

> ⏳ **À valider à la main** : ressenti dash/wall jump, lisibilité des hazards, portage sur plateforme mobile + one-way à la manette (placement provisoire — design Phase G).

---

## 🪞 v2 — Phase F : Echo + éléments avancés ✅ (terminée, sous-phases F1→F3)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §5.2 (Echo) + §5.3.

### F1 — Echo ✅ (terminée, en attente de review)
- [x] **`EchoPlatform`** — au switch (capacité `echo`), une silhouette du joueur teintée/semi-transparente reste à la position quittée, **solide dans le nouveau monde ~2,5 s** (`ECHO.LIFETIME_MS`) puis se dissout. **Max 1 active** (un nouveau switch remplace l'ancien). Câblée sur `rift-switch`, gérée par `GameScene` (collider + timer). Capacité gated par niveau (`echo` sur level3, tutoriel contextuel). Tuning dans `ECHO`.
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas) : spawn au switch à hauteur des pieds, **joueur qui tient debout dessus en l'air** (foot == echoTop == 176), remplacement au switch suivant + dissolution de l'ancien, nettoyage après 2,5 s, tuto qui se masque.

### F2 — Effondrables + boutons/portes ✅ (terminée, en attente de review)
- [x] **`CollapsiblePlatform`** (`C`) — solide jusqu'au contact, **tremble 400 ms puis tombe** (`COLLAPSE.FALL_DELAY_MS`), **réapparaît après 2 s** (`RESET_MS`). Per-monde.
- [x] **Boutons (`B`) + portes (`D`)** — plaque de pression **à enclenchement** : ouvre **toutes les portes de son monde** (liaison globale par monde pour l'instant ; un `id` de liaison ciblée viendra en Phase G). Porte = barrière solide 1×2 tuiles qui s'efface à l'ouverture. Per-monde.
- [x] Tokens de démo dans level2 (FUTUR) : `C` flottante, `B` sur le sol, `D` qui barre le passage (bouton avant la porte → solvable).
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas) : effondrable solid→gone(body off)→reset solid après 2 s ; porte **solide au départ** dans son monde → **bouton enclenché → porte ouverte** (body off) ; portes inactives dans l'autre monde.

### F3 — Collectibles ✅ (terminée, en attente de review)
- [x] **Collectibles (`o`)** — data-shards optionnels, per-monde, qui flottent (bob) et se ramassent au contact (SFX `collectible`, disparaissent). Compteur **`◆ x/y`** dans le HUD (registry `shards`/`shardsTotal`, total sur les deux mondes). Tokens de démo dans level2 (1 PASSÉ + 1 FUTUR).
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas) : HUD `◆ 0/2` → ramassage PASSÉ `◆ 1/2` (body off) → switch FUTUR (shard cachée au PASSÉ, visible au FUTUR) → ramassage `◆ 2/2`.

> ⏳ **À valider à la main** : ressenti de l'Echo (placement/durée), des effondrables, du couple bouton/porte ; valeur des collectibles. **Phase F complète.**

---

## 🗺️ v2 — Phase G : 12 niveaux / 3 chapitres (framework posé, contenu à venir)

> Réf. [DEVLOG_NEXT.md](DEVLOG_NEXT.md) §6. Approche : **framework d'abord** (cette étape), puis contenu réel **chapitre par chapitre** (niveaux from scratch).

### Framework ✅ (terminé, en attente de review)
- [x] **Structure 3 chapitres / 12 niveaux** — `CHAPTERS` (LES RUINES / LA FRACTURE / TEMPS PROFOND) + `LEVELS` (12 `LevelMeta`) dans `levels/index.ts`. `TOTAL_LEVELS = 12`.
- [x] **Capacités cumulatives par chapitre** — ch.1 `switch`+`doubleJump` ; ch.2 +`dash`+`wallJump` ; ch.3 +`echo`. Tutoriels d'introduction aux bons niveaux (2-1 dash, 2-2 wall, 3-1 echo).
- [x] **Niveaux-stubs jouables** (`levels/stub.ts`) — sol + spawn/sortie + un mur PASSÉ qui force un switch (largeur 30 = léger scroll). Les anciens level1-3 supprimés (repart de zéro).
- [x] **Écran inter-niveau enrichi** — affiche le nom du niveau franchi + **bandeau « CHAPITRE n — NOM »** à l'entrée d'un nouveau chapitre.
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas) : 12 niveaux, HUD `NIVEAU 1/12`, dash **gated** en ch.1 et **débloqué** en ch.2 (tuto affiché), bandeau « CHAPITRE 2 — LA FRACTURE » à la transition, stub solvable (switch au mur → sortie).

### Contenu réel — Chapitre 1 : LES RUINES ✅ (terminé, en attente de review)

> Capacités : switch + double saut. Hazard signature : les fosses. Méthode enseigner → tester → twister → intégrer.

- [x] **Builder de niveau** (`levels/builder.ts`) — `GridBuilder` (stampage `set`/`hLine`/`vLine`/`rect`/`frame`/`clone`) : largeur/hauteur **garanties par construction**, stamp hors-limites = exception ⇒ les fautes de coordonnées sortent à la validation, pas dans le navigateur. Pattern : `base` partagée → `clone()` en PASSÉ/FUTUR → on stampe les diffs par timeline (S/E/P forcément alignés).
- [x] **4 niveaux from scratch** (`levels/chapter1.ts`, solutions documentées en tête) :
  - **1-1 ENSEIGNER** (42×14) — marche, petite fosse, corniche+shard, premier **mur de phase** PASSÉ (F→FUTUR ouvert).
  - **1-2 TESTER** (50×14) — grand vide = **double saut**, checkpoint, énigme switch (mur PASSÉ vs **pierres de gué** FUTUR), intro **one-way** + shard.
  - **1-3 TWISTER** (54×14) — couloir de **murs alternés** (switch en boucle, sol plein = jamais de chute au switch), 2 shards d'exploration, respiration.
  - **1-4 INTÉGRER** (66×14) — fosses + mur de phase + montée + one-way + **grand vide double saut** sous checkpoint + énigme finale de switch, 3 shards.
- [x] **DA par chapitre** (`CHAPTER_GRADE` dans constants ; `Atmosphere` + `GameScene`) — chaque chapitre a son identité par-dessus la palette par monde : ch.1 **base neutre chaude**, ch.2 **+saturation/bloom** (relevé), ch.3 **désaturé/sombre + glow accru**. Leviers : alpha du light-wash, alpha de la vignette, calque de teinte plein écran (blend par chapitre), **ColorMatrix WebGL** (saturation, no-op gracieux en Canvas), multiplicateur de glow de la sortie.
- [x] `tsc --noEmit` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (Playwright headless, Chromium) : boot→menu→**1-1** sans exception ; rendu DA ch.1 (PASSÉ chaud / FUTUR froid + vignette + parallax) ; **switch F** opère et re-grade la scène ; **toggle des collectibles par monde** (shard visible au PASSÉ, masqué au FUTUR) ; HUD `NIVEAU 1/12` + `◆ 0/1` ; liseré d'accent joueur = monde courant.

> ⏳ **À valider à la main** : franchissement réel des sauts/fosses (le déplacement touche-maintenue n'est pas testable en headless — rAF throttlé), ressenti et difficulté des 4 niveaux, lisibilité du grade ch.1. Calibrage des gaps fait d'après la physique documentée (saut ≈ 5 tuiles, double ≈ 9) avec marge.

### Contenu réel — Chapitre 2 : LA FRACTURE ✅ (terminé, en attente de review)

> Capacités : switch + double saut + **dash** + **saut mural**. Hazards : piques/lasers (`^`) + plateformes mobiles (`M`). DA ch.2 (saturée) appliquée automatiquement.

- [x] **4 niveaux from scratch** (`levels/chapter2.ts`, solutions documentées en tête) :
  - **2-1 ENSEIGNER dash** (48×14) — plafonds bas : impossible de sauter, on **dash** (i-frames) à travers un pic ; fosse double saut ; mur de phase.
  - **2-2 ENSEIGNER saut mural** (50×14) — **puits verticaux** trop hauts pour le double saut : on remonte en saut mural de paroi en paroi jusqu'à la corniche.
  - **2-3 TWISTER** (60×14) — dash + saut mural mêlés au switch + **plateforme mobile** (FUTUR) qui franchit une fosse + puits mural de phase.
  - **2-4 INTÉGRER** (72×14) — long parcours : pics, mobile, puits mural, grand vide, **2 checkpoints**, énigmes de monde.
- [x] `tsc` ✓ · `npm run build` ✓
- [x] **Vérifié en navigateur** (pas-à-pas) : structure valide (largeurs garanties + `validateAllLevels`), capacités/tutoriels corrects ; **dash qui traverse le pic** (passe vivant) ; **wall-slide** (vy plafonnée 95) + **wall-jump** (poussée vx=250 à l'opposé) opérationnels dans la géométrie réelle.

> ⏳ **À valider à la main (important)** : franchissement réel des **4 parcours complets** non testé en headless (rAF gelé) — j'ai vérifié que les *mécaniques* fonctionnent dans la géométrie, pas un run de bout en bout. Hazards/fosses rendus indulgents (pics à 1 tuile pour le dash, fosses calibrées) ; les passages les plus pointus (timing des plateformes mobiles, remontée des puits muraux) demandent ton playtest pour la difficulté/solvabilité.

### Contenu réel — Chapitre 3 : TEMPS PROFOND ✅ (terminé, en attente de review)

> Capacités : switch + double saut + dash + saut mural + **echo**. Hazards : plateformes effondrables (`C`), boutons/portes (`B`/`D`). DA ch.3 (désaturée, glow fort).

- [x] **4 niveaux from scratch** (`levels/chapter3.ts`) :
  - **3-1 ENSEIGNER echo** — intro effondrables + mur infranchissable nécessitant l'Echo.
  - **3-2 TESTER echo** — gouffre géant + tunnel de pics.
  - **3-3 TWISTER boutons/portes** — boutons inaccessibles, portes bloquantes.
  - **3-4 INTÉGRER temple final** — mix maximal Echo + portes de mondes différents + effondrables.
- [x] `tsc` ✓ · `npm run build` ✓

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
