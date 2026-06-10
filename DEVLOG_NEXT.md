# RIFT — DEVLOG_NEXT.md
> Roadmap v2 — de « MVP fonctionnel » à « jeu avec identité et game feel ».
> Handoff pour Claude Code. Lire en entier avant d'implémenter.
> Réfs : [DEVLOG.md](DEVLOG.md) (cahier des charges v1) · [COMPTE-RENDU.md](COMPTE-RENDU.md) (état v1) · [PROGRESS.md](PROGRESS.md)

---

## 0. Vision v2

Le MVP prouve la mécanique. La v2 doit la rendre **mémorable**. Trois objectifs :

1. **Game feel** — chaque action (saut, switch, mort) doit être satisfaisante via feedback amplifié (juice), sans noyer la lisibilité (modèle Celeste : juice au service de la clarté).
2. **Identité visuelle** — une direction artistique cohérente PASSÉ/FUTUR avec profondeur (parallax), lumière et contraste qui guident le joueur.
3. **Profondeur de gameplay** — un système de mécaniques débloquées par chapitre, et des niveaux conçus selon la méthode *enseigner → tester → twister → intégrer*.

> ⚠️ **Règle commits** (rappel) : aucune mention de Claude dans les messages de commit.
> Travailler par **phases** (voir §10). Commit propre à la fin de chaque phase. Mettre à jour PROGRESS.md au fur et à mesure.

---

## 1. Refonte de la Direction Artistique

### 1.1 Palettes affinées (hue-shifting)

Le MVP a 1 couleur de plateforme par monde. On passe à des **rampes de 4 tons** par monde, avec hue-shifting (ombres décalées vers le froid, lumières vers le chaud) — technique standard du pixel art pro.

```typescript
// constants.ts — remplacer les couleurs simples de WORLDS
export const PALETTE = {
  past: {
    // RUINES — chaud, désaturé, mélancolique
    bgFar:    0x0d0805,
    bgMid:    0x1a1008,
    bgNear:   0x2a1c0e,
    tileShadow:    0x4a3318,  // ombre (légèrement vers le rouge profond)
    tileBase:      0x6b4f2a,
    tileMid:       0x8b6914,
    tileHighlight: 0xd4a017,
    accent:        0xe8b43a,  // doré chaud — guide le regard
    hazard:        0xc73e1d,  // rouille / danger
    glow:          0xffd27a,
  },
  future: {
    // CYBER — froid, néon, clinique
    bgFar:    0x01040d,
    bgMid:    0x020818,
    bgNear:   0x06112b,
    tileShadow:    0x06304f,  // ombre (vers le violet)
    tileBase:      0x0a4a7a,
    tileMid:       0x0d6ba8,
    tileHighlight: 0x1a9fd4,
    accent:        0x00f5ff,  // cyan néon — guide le regard
    hazard:        0xff2d6e,  // laser magenta
    glow:          0x7af5ff,
  }
} as const;
```

**Principe directeur** : la couleur d'**accent** (or pour PASSÉ, cyan pour FUTUR) est réservée aux éléments avec lesquels le joueur interagit (sortie, plateformes mobiles, collectibles). Tout ce qui est décor reste désaturé. Le joueur apprend inconsciemment : « ce qui brille = important ».

### 1.2 Backgrounds parallax (profondeur)

Remplacer le fond plat par **3 couches de parallax** générées procéduralement (TileSprite, scroll factor différent par couche) :

```
Couche 0 (bgFar)  — scrollFactor 0.1 — silhouettes lointaines (montagnes ruines / skyline tours)
Couche 1 (bgMid)  — scrollFactor 0.3 — structures intermédiaires
Couche 2 (bgNear) — scrollFactor 0.6 — éléments proches flous (premier plan décoratif)
```

Chaque couche a une variante PASSÉ et une variante FUTUR ; au switch, cross-fade entre les deux jeux de couches (tween alpha 280 ms, synchro avec l'effet de transition existant).

> Implémentation : `BootScene` génère 6 textures de parallax (3 couches × 2 mondes) via graphics procéduraux — silhouettes simples (rectangles/polygones empilés avec dégradé d'alpha). Pas d'asset binaire, on reste sur la philosophie v1.

### 1.3 Lumière & atmosphère

- **Vignette** globale (PostFX ou overlay radial sombre sur les bords) — concentre le regard au centre, ajoute de la dramaturgie.
- **Lueur d'accent** (glow) sur la sortie et les éléments interactifs : halo pulsé (tween scale + alpha sur un sprite additif `BlendMode.ADD`).
- **Light wash par monde** : léger calque de couleur plein écran en `BlendMode.OVERLAY` (chaud pour PASSÉ, froid pour FUTUR) — unifie la palette de la scène.
- **Particules d'ambiance** par monde :
  - PASSÉ : poussière/cendres qui tombent lentement (particules ocre, faible alpha, drift latéral léger).
  - FUTUR : data-motes / étincelles cyan qui montent (glitch ascendant).

### 1.4 Style guide (à mettre dans `STYLE.md`)

```
Résolution logique : 800×448 (16×9-ish), tiles 32px
Contours : 1px sur les éléments interactifs (sortie, plateformes mobiles, joueur), AUCUN sur le décor
Shading : 3 tons par surface (shadow / base / highlight), hue-shift froid→chaud
Accent = interaction. Décor = désaturé.
Anim : 100ms base frame ; idle 4f, run 6f, jump 1f montée + 1f sommet + 1f chute
```

---

## 2. Texturing amélioré

Garder l'approche **procédurale** (zéro asset binaire) mais monter en qualité. Dans `BootScene`, refactorer la génération de textures :

### 2.1 Tiles à 3 tons + variantes

Chaque tile (passé/futur) en **3 tons** (shadow/base/highlight) avec :
- Biseau lumière en haut-gauche, ombre en bas-droite (volume).
- **3 variantes aléatoires** par monde (micro-détails différents : fissures pour PASSÉ, lignes de circuit pour FUTUR) pour casser la répétition. Choisir la variante au build du niveau via `Phaser.Math.RND`.
- Tiles de **bord** distincts (top edge avec liseré d'accent fin) vs tiles **internes** (plus sombres, moins de contraste) — règle de level design : le contour du sol est plus lumineux que l'intérieur.

### 2.2 Texture helper générique

```typescript
// BootScene — fonction générique de génération de tile
function makeTile(scene, key, ramp: {shadow, base, highlight}, decorate: (g) => void) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(ramp.base);   g.fillRect(0, 0, 32, 32);
  g.fillStyle(ramp.highlight); g.fillRect(0, 0, 32, 3); g.fillRect(0, 0, 3, 32); // biseau clair
  g.fillStyle(ramp.shadow);    g.fillRect(0, 29, 32, 3); g.fillRect(29, 0, 3, 32); // ombre
  decorate(g);              // fissures / circuits selon le monde
  g.generateTexture(key, 32, 32);
  g.destroy();
}
```

### 2.3 Glow / additive textures

Générer des textures « glow » radiales (gradient alpha) pour : halo de sortie, traînée de dash, particules. Rendre en `BlendMode.ADD` pour l'effet néon.

---

## 3. Personnage & Animations

### 3.1 Sprite joueur enrichi

Le joueur reste généré procéduralement mais avec une **silhouette lisible** :
- Capsule à visière (existant) + **liseré d'accent** qui prend la couleur du monde actuel (or en PASSÉ, cyan en FUTUR) → renforce le feedback du monde courant en permanence.
- Optionnel (post-MVP) : passer à un vrai **atlas spritesheet** (idle/run/jump/fall/dash) si on veut des anims pixel réelles. Pour l'instant, animation par **tweens + squash/stretch** (suffisant et dans la philo procédurale).

### 3.2 Animation par tweens (squash & stretch)

C'est LE point qui sépare un platformer rigide d'un platformer vivant (réf. Celeste — Madeline s'étire au saut, se compresse à l'atterrissage).

| Action | Effet |
|---|---|
| **Saut (départ)** | étirement vertical (scaleY 1.25, scaleX 0.8) sur 80ms puis retour |
| **Apex (sommet)** | bref `scaleX 1.1` (sensation de flottement) |
| **Atterrissage** | compression (scaleY 0.7, scaleX 1.25) sur 100ms puis rebond élastique (`Back.easeOut`) |
| **Course** | léger bob vertical (±2px) + inclinaison 3-5° dans le sens du mouvement |
| **Demi-tour** | flip avec petit skew, poussière au sol |
| **Dash** | étirement dans la direction du dash + résidu fantôme (after-images) |
| **Switch de monde** | flash sur le sprite + inversion rapide d'échelle (effet « phase ») |
| **Mort** | spin + shrink + tint hazard (existant, à garder/affiner) |

### 3.3 Particules liées au perso

- **Poussière de course** : petit burst au sol toutes les ~200ms en courant.
- **Poussière d'atterrissage** : burst radial à l'impact, intensité proportionnelle à la vitesse de chute.
- **Traînée de saut/dash** : after-images (sprites du joueur en alpha décroissant).
- **Particules de switch** : éclatement aux couleurs du nouveau monde autour du joueur.

### 3.4 Effet « hair/trail » (signature visuelle)

Une petite **traînée fantôme** qui suit le joueur avec délai (3-4 copies en alpha décroissant, mise à jour à chaque frame). Couleur = accent du monde actuel. C'est la signature visuelle « rift » — le perso laisse une rémanence temporelle, cohérent avec le thème.

---

## 4. Couche Game Feel (juice + contrôles)

> Priorité absolue : un platformer se juge à la **seconde-à-seconde**. Ces réglages passent avant le contenu.

### 4.1 Contrôles « player-friendly » (standards de l'industrie)

À ajouter dans `Player.ts` :

| Technique | Description | Valeur de départ |
|---|---|---|
| **Coyote time** | fenêtre de saut après avoir quitté le sol | 100 ms |
| **Jump buffering** | mémorise l'appui saut juste avant l'atterrissage | 120 ms |
| **Variable jump height** | relâcher le bouton coupe l'ascension | couper vélocité Y à 40% au relâché |
| **Accélération / décélération** | pas de vitesse instantanée | accel ~1200 px/s², friction sol forte, air control réduit |
| **Apex hang** | gravité réduite au sommet du saut | ×0.6 quand `|vy| < 60` |
| **Fast fall** | gravité augmentée en chute | ×1.3 quand `vy > 0` |
| **Catch missed jumps** | tolérance de bord (corner correction) | nudge ±4px si le coin accroche |

Ces réglages doivent être **exposés en constantes** (un objet `FEEL` dans `constants.ts`) pour tuning rapide.

```typescript
export const FEEL = {
  COYOTE_MS: 100,
  JUMP_BUFFER_MS: 120,
  JUMP_CUT_MULT: 0.4,
  ACCEL: 1200,
  FRICTION_GROUND: 1600,
  AIR_CONTROL: 0.55,
  APEX_GRAVITY_MULT: 0.6,
  APEX_THRESHOLD: 60,
  FAST_FALL_MULT: 1.3,
  CORNER_CORRECTION_PX: 4,
} as const;
```

### 4.2 Screen shake & feedback (mesuré)

Modèle Celeste : feedback **au service de la lisibilité**, jamais gratuit.
- Atterrissage lourd : shake très léger (0.002, 80ms) seulement si chute rapide.
- Switch réussi : flash + shake léger (déjà en place, à affiner).
- Switch refusé (anti-crush) : flash rouge + shake sec + **SFX d'erreur** (cf. §8).
- Mort : shake (existant) + **freeze frame** (pause de ~60ms = « hitstop ») pour l'impact.
- **Hitstop** générique : micro-pause sur les évènements forts (mort, switch refusé) — `scene.time` scaling bref. Très efficace, peu coûteux.

### 4.3 Transition de switch enrichie

Au-delà du flash actuel :
- **Aberration chromatique** brève (PostFX ou décalage RGB sur 120ms).
- **Effet « scanline glitch »** sur 150ms (lignes horizontales déplacées).
- Cross-fade des couches parallax (§1.2).
- Le sprite joueur « phase » (inversion d'échelle rapide).

---

## 5. Système de mécaniques débloquées

> Demande clé : des mécaniques disponibles **à partir d'un certain niveau**. On construit un système propre, pas du code en dur par niveau.

### 5.1 Architecture — capacités par niveau

```typescript
// types.ts
export type Ability = 'switch' | 'doubleJump' | 'dash' | 'wallJump' | 'echo';

// levels/index.ts — chaque niveau déclare les capacités actives
export interface LevelMeta {
  id: number;
  name: string;
  chapter: number;
  abilities: Ability[];   // capacités utilisables sur ce niveau
  introduces?: Ability;   // capacité nouvellement débloquée (→ déclenche le tutoriel contextuel)
  data: LevelData;
}
```

`Player` et `WorldManager` lisent `level.abilities` pour activer/désactiver les inputs correspondants. Quand `introduces` est défini, afficher un **prompt de tutoriel contextuel** (overlay discret : « NOUVELLE CAPACITÉ : DASH — [SHIFT] ») au spawn, qui se masque après la première utilisation.

### 5.2 Les mécaniques (toutes cohérentes avec le thème temporel)

| Mécanique | Touche | Débloque | Description & justification thématique |
|---|---|---|---|
| **Double saut** | Espace×2 | dès lvl 1 | déjà en place |
| **Switch de monde** | F | dès lvl 1 | cœur du jeu, déjà en place |
| **Dash / Rift Dash** | Shift | chapitre 2 | burst horizontal rapide (~200px), i-frames courtes, traverse de petits gaps. Cooldown réinitialisé au sol. After-images. |
| **Wall slide + Wall jump** | auto + Espace | chapitre 2 | glisse le long des murs (chute ralentie), saut en rebond. Permet la verticalité entre murs de phase. |
| **Echo (signature)** | maintenir F | chapitre 3 | au switch, la position du joueur dans l'ancien monde laisse une **plateforme-écho solide temporaire** (2,5 s) dans le nouveau monde. Mécanique signature : « ton passé devient ta plateforme ». Ouvre des puzzles uniques. |

> **Le Echo est le gros morceau** et la vraie originalité. Architecture : au switch, instancier un `EchoPlatform` (StaticBody) à la position quittée, qui se dissout après un timer avec fondu. Limiter à 1 écho actif à la fois (sinon trop facile). Visuel : silhouette du joueur figée, semi-transparente, couleur d'accent.

### 5.3 Hazards & éléments interactifs (par monde)

Élargir le format de niveau avec de nouveaux tokens :

| Token | Élément | Comportement |
|---|---|---|
| `1` | sol solide | existant |
| `0` | vide | existant |
| `S` / `E` | spawn / sortie | existant |
| `^` | **piques / laser** | mort au contact. PASSÉ = piques de pierre, FUTUR = grille laser |
| `M` | **plateforme mobile** | va-et-vient (horizontal ou vertical selon config), couleur d'accent |
| `C` | **plateforme qui s'effondre** | tombe 400ms après contact, réapparaît après 2s |
| `B` | **bouton / interrupteur** | active une porte/plateforme distante |
| `D` | **porte** | ouverte/fermée selon bouton lié |
| `o` | **collectible (data-shard)** | optionnel, pour score/complétion |
| `=` | **plateforme one-way** | traversable par le bas, solide par le haut |

Chaque élément a une variante visuelle PASSÉ et FUTUR. Certains n'existent **que dans un monde** (ex. une plateforme mobile présente en FUTUR mais absente en PASSÉ) → combine avec le switch pour des puzzles riches.

---

## 6. Niveaux très élaborés

### 6.1 Structure en chapitres

Réorganiser en **3 chapitres de 4 niveaux** (12 niveaux), chacun avec sa variation de palette, sa nouvelle mécanique, et son hazard signature.

| Chapitre | Nom | Palette | Mécanique introduite | Hazard signature | Niveaux |
|---|---|---|---|---|---|
| **1** | LES RUINES | base PASSÉ/FUTUR | switch + double saut | fosses | 1-4 |
| **2** | LA FRACTURE | + saturation, contraste accru | **dash** + **wall jump** | piques/lasers + plateformes mobiles | 5-8 |
| **3** | TEMPS PROFOND | désaturé, plus sombre, glow accru | **echo** | crushers + plateformes qui s'effondrent + boutons/portes | 9-12 |

### 6.2 Méthode de conception par niveau (Nintendo : enseigner → tester → twister → intégrer)

Pour **chaque mécanique introduite**, suivre 4 beats sur les niveaux du chapitre :

1. **Enseigner** (1er niveau du chapitre) — la mécanique dans un contexte 100% sûr, sans danger de mort, pour comprendre.
2. **Tester** — un obstacle qui exige la mécanique, mais avec marge d'erreur.
3. **Twister** — combiner avec le switch / une autre mécanique (ex. dash *pendant* un switch).
4. **Intégrer** — séquence qui demande la mécanique + tout le reste, sous pression (timing, fosses).

> Augmenter la difficulté en **exigeant plus de maîtrise**, pas en gonflant des chiffres. Alterner pics et respirations (pacing) : après un niveau exigeant, un niveau plus contemplatif.

### 6.3 Niveaux plus grands que l'écran (scrolling caméra)

Le MVP est single-screen (25×14). Pour des niveaux élaborés, passer en **niveaux multi-écrans avec scroll** :
- `camera.startFollow(player, true, 0.1, 0.1)` (lerp doux).
- **Deadzone** centrale pour éviter le tremblement.
- **Camera lookahead** : décaler la caméra dans le sens du mouvement (anticipation).
- Bornes de monde = dimensions réelles du niveau (plus l'écran fixe).
- Format de niveau : grilles plus larges (ex. 60×20), validation à adapter.

### 6.4 Checkpoints

Pour les niveaux longs : tokens checkpoint `P`. Le respawn se fait au dernier checkpoint atteint (et non au spawn initial). Visuel : pilier qui s'illumine à l'activation + SFX.

### 6.5 Sortie / fin de niveau soignée

- Au contact sortie : le joueur est aspiré dans le portail (tween scale→0 + rotation), flash, puis transition.
- **Écran inter-niveau** : nom du niveau suivant + temps réalisé + shards collectés. Court (1,5 s) ou skippable.

---

## 7. Refonte du HUD

Le HUD v1 est fonctionnel mais plat. Objectif : **diégétique, animé, lisible**.

### 7.1 Indicateur de monde (pièce maîtresse)

- Badge en haut-gauche montrant le monde actif avec son **icône + couleur d'accent**.
- Au switch : animation de **flip 3D** (scaleX 1→0→1) entre les deux états + pulse.
- Petit **témoin de cooldown** du switch (arc circulaire qui se vide pendant les 400ms).
- Quand switch impossible (zone anti-switch ou cooldown) : badge clignote en hazard.

### 7.2 Jauges de capacités

- Icônes des capacités débloquées (dash, echo…) avec état (prêt / en cooldown via remplissage radial).
- Apparaissent seulement quand la capacité est débloquée (cohérent avec §5).

### 7.3 Infos de run

- **Timer** (haut-centre) — discret, pour le speedrun. Format `mm:ss.cc`.
- **Compteur de shards** `◇ 3/5` (haut-droite) si collectibles dans le niveau.
- **Morts** — déplacer en discret, ou ne montrer qu'à l'écran de fin.

### 7.4 Feedback contextuel

- **Prompt de tutoriel** (cf. §5.1) : bandeau bas discret qui s'efface à la 1re utilisation.
- **Toasts** : « CHECKPOINT », « +1 ◇ », apparition/fondu rapide.

### 7.5 Style HUD

Police monospace, fond semi-transparent avec **bordure d'accent fine** (couleur du monde actif), légère ombre portée. Cohérent avec l'esthétique « interface temporelle ».

---

## 8. Audio procédural (Web Audio API)

Pas de fichiers audio (philosophie zéro-asset) → **synthèse procédurale** via Web Audio API. Créer un module `audio/Sfx.ts` qui génère les sons à la volée (oscillateurs + enveloppes + filtres).

### 8.1 SFX à synthétiser

| Son | Recette |
|---|---|
| Saut | sine/triangle, pitch montant rapide, court (~120ms), enveloppe AD |
| Double saut | idem, pitch plus haut |
| Atterrissage | bruit filtré (lowpass) bref, « thud » |
| Dash | noise + sweep filtre passe-bande, « whoosh » |
| Switch monde | deux tons (chaud→froid ou inverse selon sens), avec léger bitcrush/glitch |
| Switch refusé | buzz dissonant court (square, basse fréquence) |
| Mort | descente de pitch + noise burst |
| Collectible | arpège cristallin (3 sine montantes) |
| Checkpoint | accord majeur doux |
| Sortie | montée triomphale |

### 8.2 Musique / ambiance

- **Drone ambiant** par monde (2-3 oscillateurs basse fréquence accordés, LFO lent) — change de tonalité/filtre au switch. PASSÉ = chaud/feutré, FUTUR = froid/métallique.
- Optionnel post-MVP : pattern rythmique léger généré (séquenceur simple).

### 8.3 Réglages

- Volume master + mute (touche `M`), persistance en mémoire de session (pas de localStorage en artifact, mais OK en build local).
- Tous les sons passent par un `GainNode` master.

---

## 9. Changements d'architecture nécessaires

Pour supporter tout ça proprement :

1. **`constants.ts`** : ajouter `PALETTE`, `FEEL`, enrichir `WORLDS`, ajouter tokens.
2. **`types.ts`** : `Ability`, `LevelMeta`, étendre `LevelCell` aux nouveaux tokens.
3. **`Player.ts`** : refonte du mouvement (accel/friction, coyote, buffer, variable jump, apex), state machine d'animation (tweens), gating des capacités, dash, wall slide/jump.
4. **`WorldManager.ts`** : zones anti-switch, intégration Echo, transition enrichie.
5. **Nouveaux modules :**
   - `objects/EchoPlatform.ts`
   - `objects/MovingPlatform.ts`, `objects/CrumblingPlatform.ts`, `objects/Hazard.ts`, `objects/Collectible.ts`, `objects/Button.ts`, `objects/Door.ts`
   - `objects/ParallaxBackground.ts`
   - `objects/PlayerTrail.ts` (after-images)
   - `audio/Sfx.ts`, `audio/Ambience.ts`
   - `fx/Juice.ts` (helpers screen shake, hitstop, particle bursts)
6. **`GameScene.ts`** : caméra qui suit + deadzone + lookahead, construction des nouveaux éléments, checkpoints, câblage audio/fx.
7. **`UIScene.ts`** : refonte complète (cf. §7).
8. **Nouvelle scène `InterLevelScene.ts`** (écran inter-niveau).
9. **`levels/`** : migration vers `LevelMeta`, niveaux multi-écrans, 12 niveaux en 3 chapitres.
10. **`STYLE.md`** : le style guide (§1.4).

---

## 10. Roadmap par phases

> Faire **une phase à la fois**, typecheck + build + commit propre entre chaque. Mettre à jour PROGRESS.md.
> Ordre pensé pour que le jeu soit jouable et testable après chaque phase.

### Phase A — Game feel (priorité n°1)
Refonte `Player.ts` : accel/friction, coyote time, jump buffer, variable jump, apex hang, fast fall, corner correction, squash & stretch (tweens), poussière course/atterrissage. Objet `FEEL` exposé.
→ *Le jeu doit déjà être bien meilleur à jouer, sans nouveau contenu.*

### Phase B — Direction artistique
`PALETTE` + tiles 3 tons + variantes, parallax 3 couches, vignette, glow sorties, particules d'ambiance, light wash, liseré d'accent joueur. `STYLE.md`.

### Phase C — Audio
`Sfx.ts` (tous les SFX) + `Ambience.ts` (drones par monde) + mute. Câblage sur les évènements existants.

### Phase D — Caméra & niveaux élaborés
Scroll caméra + deadzone + lookahead, format de niveau multi-écrans, validation adaptée, checkpoints, écran inter-niveau.

### Phase E — Système de capacités + nouvelles mécaniques
`Ability` gating, dash, wall slide/jump, tutoriels contextuels. Hazards (`^`), one-way (`=`), plateformes mobiles (`M`).

### Phase F — Mécanique signature Echo + éléments avancés
`EchoPlatform`, plateformes qui s'effondrent (`C`), boutons/portes (`B`/`D`), collectibles (`o`).

### Phase G — Contenu : 12 niveaux en 3 chapitres
Conception selon méthode enseigner→tester→twister→intégrer. Variations de palette par chapitre. Pacing pics/respirations. Solutions documentées en tête de chaque fichier niveau.

### Phase H — HUD v2 + polish final
Refonte UIScene complète, timer, jauges de capacités, toasts, freeze frames/hitstop, aberration chromatique au switch. Pass de polish général.

### Phase I — Préparation publication
`DEVLOG_NEXT.md` post-v2, README avec GIF, page itch.io, build optimisé (envisager build custom Phaser pour réduire le bundle ~1.5 Mo).

---

## 11. Critères de validation v2

- [ ] Contrôles : coyote time, jump buffer, variable jump perceptibles et agréables
- [ ] Le joueur a une vraie personnalité visuelle (squash/stretch, traînée, poussière)
- [ ] Parallax + vignette + glow donnent de la profondeur et guident le regard
- [ ] Chaque monde a une ambiance sonore distincte ; tous les SFX en place
- [ ] La caméra suit proprement sur des niveaux plus grands que l'écran
- [ ] Dash, wall jump et Echo fonctionnent et sont introduits proprement
- [ ] Les nouvelles mécaniques sont gated par niveau (système `Ability`)
- [ ] 12 niveaux en 3 chapitres, difficulté progressive, chacun solvable
- [ ] HUD v2 : indicateur de monde animé, timer, jauges de capacités
- [ ] Hitstop / aberration chromatique au switch et à la mort
- [ ] `tsc --noEmit` ✓ · `npm run build` ✓ après chaque phase

---

## 12. Garde-fous

- **Ne pas tout casser d'un coup.** Respecter l'ordre des phases ; le jeu reste jouable et buildable à la fin de chacune.
- **Le game feel passe avant le contenu** (Phase A en premier, non négociable).
- **Juice au service de la lisibilité** (modèle Celeste) — si un effet gêne la lecture du gameplay, le réduire.
- **Tuning exposé en constantes** (`FEEL`, `PALETTE`) — pas de valeurs magiques dispersées.
- **Tester la solvabilité** de chaque niveau (documenter la solution en commentaire).
- **Philosophie zéro-asset** maintenue autant que possible (tout procédural). Si un atlas spritesheet devient nécessaire pour les anims, le proposer explicitement avant.
- **Commits propres**, aucune mention de Claude, un commit par phase minimum.
