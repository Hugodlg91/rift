# RIFT — Compte rendu de développement

> État du projet à la fin de la session du **2026-06-08**.
> Document de référence : architecture, arborescence, mécaniques, décisions.
> Cahier des charges → [DEVLOG.md](DEVLOG.md) · Suivi des tâches → [PROGRESS.md](PROGRESS.md)

---

## 1. Résumé exécutif

**RIFT** est un platformer 2D navigateur où le joueur bascule entre deux versions
d'un même niveau — le **PASSÉ** (ruines chaudes) et le **FUTUR** (cyberpunk froid).
Les plateformes sont inversées entre les deux mondes : ce qui bloque dans l'un
laisse passer dans l'autre (réf. « Crack in the Slab », Dishonored 2).

**Statut : MVP fonctionnellement complet et vérifié au build.**
- `tsc --noEmit` : ✅ 0 erreur
- `npm run build` : ✅ (20 modules, bundle ~1.5 Mo / 345 Ko gzip)
- Serveur de dev : ✅ démarre sur `:5173`, transforme tous les modules
- Test manuel navigateur (ressenti de jeu) : ⏳ à faire (non automatisable ici)

**Volume de code :** ~1320 lignes de TypeScript réparties sur 15 fichiers source.

---

## 2. Stack technique

| Outil | Version | Rôle |
|---|---|---|
| Node.js | 22.22.0 | runtime de build |
| Phaser | 3.90.0 | moteur de jeu (rendu, physique Arcade, scènes, input) |
| TypeScript | 5.9.3 | typage strict (`strict`, `noUnusedLocals`, `noUnusedParameters`) |
| Vite | 6.4.3 | dev server + bundler |

Aucune dépendance externe supplémentaire. Pas de Tiled : les niveaux sont des
tableaux 2D en code. Tous les visuels sont **générés programmatiquement** (aucun
asset binaire).

---

## 3. Arborescence

```
rift/
├── index.html              # point d'entrée HTML, conteneur #game, plein écran
├── package.json            # scripts (dev/build/preview) + deps
├── package-lock.json
├── tsconfig.json           # TS strict, noEmit (tsc = typecheck, vite = build)
├── vite.config.ts          # base './', port 5173, outDir dist
├── .gitignore
├── README.md               # présentation + contrôles (EN)
├── DEVLOG.md               # cahier des charges (handoff initial)
├── PROGRESS.md             # journal de progression temps réel
├── COMPTE-RENDU.md         # ce fichier
└── src/
    ├── main.ts             # config Phaser + instanciation du jeu          (29 l.)
    ├── constants.ts        # TILE_SIZE, WORLDS, physique, clés, helpers     (109 l.)
    ├── types.ts            # interfaces (WorldDef, LevelData, ...)          (39 l.)
    ├── levels/
    │   ├── index.ts        # LEVELS[] + validateLevel() (dims + spawn/exit) (55 l.)
    │   ├── level1.ts       # tuto (verbatim DEVLOG)                         (44 l.)
    │   ├── level2.ts       # « Portes de Phase »                            (52 l.)
    │   └── level3.ts       # « Le Gantelet »                                (53 l.)
    ├── objects/
    │   ├── Player.ts       # déplacement, double saut, mort/respawn         (153 l.)
    │   └── WorldManager.ts # switch monde, anti-crush, effets               (158 l.)
    └── scenes/
        ├── BootScene.ts    # génère les textures, puis → Menu               (146 l.)
        ├── MenuScene.ts    # écran titre split PASSÉ/FUTUR + glitch         (120 l.)
        ├── GameScene.ts    # boucle de jeu principale                       (175 l.)
        ├── UIScene.ts      # HUD overlay (monde / niveau / morts)           (111 l.)
        └── EndScene.ts     # écran de fin (victoire + morts)                (77 l.)
```

> Ignorés par git : `node_modules/`, `dist/`, `.claude/`.

---

## 4. Architecture & flux

### 4.1 Enchaînement des scènes

```
BootScene ──(textures générées)──► MenuScene
                                      │  [ENTRÉE]
                                      ▼
                                  GameScene ◄──────────┐
                                      │ launch          │ scene.start(niveau+1)
                                      ▼                 │ (fade out → in)
                                  UIScene (overlay)     │
                                      │                 │
                       sortie atteinte ─────────────────┤
                                      │ dernier niveau ?
                                      ▼ oui
                                  EndScene ──[ENTRÉE]──► MenuScene
```

- `BootScene`, `MenuScene`, `EndScene` : exclusives (une à la fois).
- `GameScene` + `UIScene` : **actives en parallèle**, l'UI rendue par-dessus
  (caméra transparente).
- Le passage d'un niveau au suivant fait un `scene.start('GameScene', { level })`
  (reconstruction propre), encadré par un fondu caméra.

### 4.2 État partagé — le *registry* Phaser

Le registry (store global au niveau du jeu) découple les scènes et **survit aux
redémarrages** de `GameScene` :

| Clé | Type | Écrite par | Lue par |
|---|---|---|---|
| `world` | `'past' \| 'future'` | `WorldManager.applyWorldState()` | UIScene (indicateur+pulse), GameScene (texture du portail) |
| `level` | `number` (1-based) | `GameScene.create()` | UIScene |
| `deaths` | `number` | `MenuScene` (=0), `GameScene` (`inc`) | UIScene, EndScene |

Les consommateurs réagissent aux événements `changedata-<clé>` ; ces handlers
sont **détachés au `SHUTDOWN`** de chaque scène (le registry étant global, sinon
fuite/doublons au changement de niveau).

### 4.3 Événements objet

| Émetteur | Événement | Écouteur → action |
|---|---|---|
| `Player` | `died` | GameScene → `deaths++`, shake caméra |
| `Player` | `respawn` | GameScene → `worldManager.reset('past')` (avant repositionnement) |

---

## 5. Détail des modules

### `constants.ts`
Source unique de vérité : `TILE_SIZE=32`, `GAME_WIDTH=800`, `GAME_HEIGHT=448`,
`GRAVITY_Y=600`, l'objet `WORLDS` (couleurs PAST/FUTURE), physique joueur
(`PLAYER_SPEED=180`, `JUMP_VELOCITY=-420`, `MAX_AIR_JUMPS=1`), `SWITCH_COOLDOWN_MS=400`,
les énumérations `CELL`/`TEX`/`SCENE`, et les helpers `getWorld`, `otherWorld`, `toCSS`.

### `types.ts`
`WorldId`, `WorldDef`, `LevelData` (`{ width, height, past[][], future[][] }`),
`LevelCell` (`number | string`, volontairement souple pour que les grilles
écrites à la main typent proprement), `Point`.

### `objects/Player.ts`  *(extends `Arcade.Sprite`)*
- Entrées : `←→`/`A D` (déplacement), `Espace`/`↑`/`W` (saut, via `JustDown`).
- Saut : 1 saut au sol + 1 saut aérien (`MAX_JUMPS=2`), squash-and-stretch.
- Collision bords du monde **active** (le bas est ouvert côté GameScene).
- `die()` : fige la physique, tint rouge + spin/shrink, émet `died`, `respawn`
  programmé à +800 ms.
- `respawn()` : émet `respawn` (la scène remet le monde au PASSÉ **avant**),
  `body.reset(spawn)`, fondu d'apparition.

### `objects/WorldManager.ts`
Cœur de la mécanique. Possède les 2 `StaticGroup` + 2 `Collider`.
- `switch()` : si pas en cooldown et vivant → `isSwitchSafe()` → bascule.
- `isSwitchSafe()` : test **AABB** de la boîte joueur (rétractée de 2 px) contre
  tous les solides du monde cible → bloque si chevauchement (anti-écrasement).
- `applyWorldState()` : active le bon collider, masque/affiche les groupes,
  publie `world` dans le registry.
- `playTransitionEffect()` : `flash` (couleur du nouveau monde) + `shake` +
  tween de couleur de fond (280 ms). Refus → `playDeniedEffect()` (flash rouge).
- `reset(world)` : bascule instantanée sans contrôle (utilisé au respawn).

### `scenes/BootScene.ts`
Génère 5 textures via `make.graphics(...).generateTexture(...)` :
`tile_past` (pierre fissurée), `tile_future` (panneau à circuits néon),
`player` (capsule neutre à visière), `exit_past`/`exit_future` (portails lumineux).
Puis `→ MenuScene`.

### `scenes/GameScene.ts`
- `init(data.level)` → `create()` : valide le niveau (en dev), pose les bornes
  monde (bas ouvert), construit les 2 couches de tuiles, place joueur + portail,
  instancie le `WorldManager`, lance l'UI, câble les événements, fondu d'entrée.
- `update()` : `player.update()`, touche `F` → `switch()`, détection de chute
  (`body.top > hauteur` → `die()`).
- Sortie atteinte (overlap) → fondu → niveau suivant **ou** `EndScene`.

### `scenes/UIScene.ts`
HUD overlay transparent : indicateur de monde (haut-gauche, couleur d'accent +
pulse au switch), `NIVEAU x/3` (haut-droite), `MORTS n`. Tout est piloté par le
registry.

### `scenes/MenuScene.ts` / `EndScene.ts`
Titre « RIFT » glitché sur fond divisé PASSÉ/FUTUR avec couture animée ;
contrôles affichés. EndScene : « RIFT TRAVERSÉ » + compteur de morts + rejouer.

### `main.ts`
Config Phaser : `AUTO`, 800×448, `parent:'game'`, Arcade gravité 600,
scènes `[Boot, Menu, Game, UI, End]`, scale `FIT` + `CENTER_BOTH`.

---

## 6. Mécaniques de jeu

| Mécanique | Implémentation |
|---|---|
| Déplacement | vélocité ±180 px/s, flip selon le sens |
| Saut | impulsion −420, 1 saut aérien autorisé |
| Switch de monde (`F`) | toggle + collider/visibilité par groupe, cooldown 400 ms |
| Anti-écrasement | AABB joueur vs solides du monde cible ; switch refusé sinon |
| Transition | flash + shake + tween de fond (couleur du monde) |
| Mort par chute | bord bas du monde ouvert → `body.top` dépasse → `die()` |
| Respawn | retour au spawn après 800 ms, monde forcé au PASSÉ |
| Sortie | overlap joueur/portail → niveau suivant (fondu) |
| Fin | après niveau 3 → EndScene |
| HUD | monde courant, niveau, morts (via registry) |

---

## 7. Design des niveaux

Tous en **25×14 tuiles = 800×448 px** (un écran, sans scroll).
Tokens : `1` solide · `0` vide · `'S'` spawn · `'E'` sortie.
Spawn et sortie sont identiques dans les deux mondes (vérifié par `validateLevel`).

> **Principe « switch obligatoire »** : les niveaux 2 & 3 utilisent des **murs de
> phase pleine hauteur** (sol→plafond) — infranchissables même au double saut —
> solides dans un monde, ouverts dans l'autre. Aucune solution mono-monde
> n'existe. Les fosses mortelles, elles, sont ouvertes dans les deux mondes
> (simple obstacle de saut, mortel si raté).

| Niveau | Nom | Murs de phase | Fosse mortelle | Switches forcés |
|---|---|---|---|---|
| 1 | tuto (verbatim DEVLOG) | — (indulgent) | non (sol plein) | 0 (incite seulement) |
| 2 | Portes de Phase | PAST @col9 · FUTUR @col19 | cols 14–16 | 2 |
| 3 | Le Gantelet | PAST @col6 & @col19 · FUTUR @col12 | cols 15–16 | 3 (+ ledge de sortie surélevée) |

La solution prévue de chaque niveau est documentée en commentaire en tête de
`level2.ts` / `level3.ts`.

---

## 8. Critères de validation MVP

| Critère (DEVLOG) | Statut |
|---|---|
| Lancement `localhost:5173` sans erreur | ✅ build + dev server OK |
| Déplacement + saut | ✅ implémenté |
| `F` switche le monde avec effet visuel | ✅ implémenté |
| Tiles du monde inactif masquées | ✅ implémenté |
| Switch bloqué si écrasement | ✅ implémenté (AABB) |
| Chute hors niveau → respawn | ✅ implémenté |
| Sortie → niveau suivant | ✅ implémenté |
| Niveau 3 → écran de fin | ✅ implémenté |
| HUD affiche le monde courant | ✅ implémenté |

> Les ✅ « implémenté » sont validés par typecheck/build et revue de code, mais
> **pas encore par un test de jouabilité manuel** dans le navigateur.

---

## 9. Vérifications effectuées

1. **Typecheck** — `npx tsc --noEmit` → 0 erreur (TS strict).
2. **Build** — `npm run build` → 20 modules, succès.
3. **Dev server** — `npm run dev` → prêt en ~170 ms, `/src/main.ts` transformé (HTTP 200).
4. **Validation des grilles** — script ponctuel (esbuild) : dimensions 25×14 et
   cohérence spawn/sortie OK sur les 3 niveaux. Le contrôle est aussi exécuté au
   boot en mode dev (`validateLevel`).

---

## 10. Décisions techniques & déviations

- **`EndScene` ajoutée** (hors arborescence d'origine) pour le critère « écran de
  fin ». Enregistrée dans `main.ts`.
- **État via registry** plutôt qu'événements de scène : robuste aux redémarrages
  de `GameScene` entre niveaux.
- **Bords du monde** : collision gauche/droite/haut activée, **bas ouvert** —
  empêche de sortir latéralement (utile au spawn bord-gauche du niveau 1 du
  DEVLOG) tout en gardant la mort par chute.
- **Textures** : `make.graphics({x,y}, false)` (le 2ᵉ arg `addToScene` ; la
  propriété `add` du DEVLOG n'existe pas dans le typage Phaser).
- **`.gitignore`** : conserve une entrée `.claude/` (déjà présente, pertinente).
- **Règle commits** respectée : aucune mention de Claude n'est prévue dans les
  messages.

---

## 11. Commandes

```bash
npm install      # dépendances
npm run dev      # dev server → http://localhost:5173
npm run build    # build prod → dist/
npm run preview  # prévisualise le build
```

---

## 12. Limitations connues & prochaines étapes

**À valider :**
- Test de jouabilité manuel (ressenti des sauts, lisibilité des switches,
  solvabilité réelle des niveaux 2 & 3).

**Pistes / dette légère :**
- Bundle ~1.5 Mo (Phaser complet) → build custom Phaser ou code-splitting si besoin.
- Niveaux en single-screen ; un scroll caméra (`startFollow`) permettrait des
  niveaux plus longs.
- Animations joueur « fakées » (flip + tweens) faute de spritesheet — un atlas
  donnerait idle/run/jump/fall réels.

**Post-MVP (DEVLOG) :** ennemis (gardes/drones), audio par monde, éditeur Tiled,
timer speedrun/leaderboard, publication itch.io. Prévoir `DEVLOG_NEXT.md`.
