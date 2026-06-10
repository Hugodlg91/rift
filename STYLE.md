# RIFT — Style guide

> Direction artistique (v2, Phase B). Référence pour toute texture / couleur / effet.
> Source de vérité couleur : `PALETTE` dans [src/constants.ts](src/constants.ts).

---

## Principes

1. **Accent = interaction.** La couleur d'accent (or `#e8b43a` pour PASSÉ, cyan `#00f5ff` pour FUTUR) est réservée aux éléments avec lesquels le joueur interagit : sortie, liseré du joueur, edges de plateforme, (à venir) plateformes mobiles / collectibles. Le décor reste **désaturé**. Le joueur apprend : *ce qui brille = important*.
2. **Hue-shifting.** Les ombres glissent vers le froid, les lumières vers le chaud. Jamais d'assombrissement « plat » (même teinte plus sombre).
3. **Juice au service de la lisibilité** (modèle Celeste). Un effet qui gêne la lecture du gameplay est réduit.
4. **Zéro asset binaire.** Tout est généré procéduralement (`BootScene`) : graphics + canvas radiaux.

---

## Résolution & grille

```
Résolution logique : 800 × 448 (25 × 14 tiles, ~16:9)
Tile : 32 px
Joueur : 20 × 28 px (corps physique)
Scale : FIT + CENTER_BOTH
```

## Contours

- **1 px d'accent** sur le haut des tiles de bord (sol exposé) et liseré (glow) sur le joueur / la sortie.
- **Aucun contour** sur le décor (parallax, intérieur des plateformes).
- Règle de level design : *le contour du sol est plus lumineux que son intérieur* → tiles `edge` vs `variant`.

## Shading des surfaces (3 tons)

Chaque tile = 3 tons issus de la rampe 4-tons du monde :

| Rôle | PASSÉ | FUTUR |
|---|---|---|
| shadow (bas-droite) | `#4a3318` | `#06304f` |
| base / mid (surface) | `#8b6914` | `#0d6ba8` |
| highlight (haut-gauche) | `#d4a017` | `#1a9fd4` |

+ biseau lumière haut-gauche, ombre bas-droite (volume). 3 variantes aléatoires par monde (fissures PASSÉ / circuits FUTUR) pour casser la répétition.

## Rampes complètes (`PALETTE`)

| Token | PASSÉ | FUTUR | Usage |
|---|---|---|---|
| bgFar / bgMid / bgNear | `#0d0805` / `#1a1008` / `#2a1c0e` | `#01040d` / `#020818` / `#06112b` | 3 couches parallax |
| tileShadow→tileHighlight | `#4a3318`…`#d4a017` | `#06304f`…`#1a9fd4` | tiles 3 tons |
| accent | `#e8b43a` | `#00f5ff` | interaction / liseré |
| hazard | `#c73e1d` | `#ff2d6e` | danger (Phase E) |
| glow | `#ffd27a` | `#7af5ff` | halos additifs, wash, particules |

## Profondeur & atmosphère (depths)

```
parallax far / mid / near   -30 / -20 / -10   (cross-fade 280ms au switch)
tiles                          0
ambient particles              2   (PASSÉ: cendres qui tombent / FUTUR: motes qui montent, ADD)
exit glow (ADD) / portal       3 / 4
player dust / player           9 / 10   (+ rim glow accent via postFX)
light wash (OVERLAY)          40   (unifie la palette de la scène)
vignette                      60
HUD (UIScene, scène séparée)  au-dessus de tout
```

## Animation (procédural, Phase A)

Pas de spritesheet pour l'instant — squash & stretch par ressort (spring) + tilt :

```
Saut (départ) : stretch scaleY↑ / scaleX↓
Atterrissage  : squash scaleX↑ / scaleY↓ (∝ vitesse de chute) + poussière
Course        : tilt 5° + poussière toutes les ~200ms
Spring        : retour à 1 en décroissance exponentielle (frame-independent)
```

> Cible future (si besoin d'anims pixel réelles, à proposer avant) : atlas 100 ms/frame — idle 4f, run 6f, jump 1f montée + 1f sommet + 1f chute.
