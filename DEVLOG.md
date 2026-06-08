# RIFT — DEVLOG.md
> Handoff file pour Claude Code. Lis ce fichier en entier avant d'écrire la moindre ligne de code.

---

## 🎮 Concept

**RIFT** est un platformer 2D browser-based où le joueur peut switcher entre deux versions du même niveau : le **PASSÉ** (ruines, béton, ambiance chaude) et le **FUTUR** (cyberpunk, néon, ambiance froide). Les plateformes sont inversées entre les deux mondes — ce qui bloque dans l'un laisse passer dans l'autre. Référence directe : mécanique "Crack in the Slab" de Dishonored 2.

---

## 🛠️ Stack technique

```
Phaser 3 (^3.87.0)
TypeScript (^5.x)
Vite (^6.x)
```

Pas de dépendance externe supplémentaire pour le MVP. Pas de Tiled pour l'instant — les niveaux sont définis en code via des tableaux 2D.

---

## 📁 Structure de fichiers cible

```
rift/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── assets/            # vide pour l'instant, assets générés programmatiquement
└── src/
    ├── main.ts             # point d'entrée, config Phaser
    ├── constants.ts        # TILE_SIZE, WORLD, couleurs, touches
    ├── types.ts            # interfaces TypeScript (WorldState, LevelData, etc.)
    ├── levels/
    │   ├── level1.ts
    │   ├── level2.ts
    │   └── level3.ts
    ├── objects/
    │   ├── Player.ts       # classe Player (mouvement, saut, état)
    │   └── WorldManager.ts # gestion du switch past/future + effet visuel
    └── scenes/
        ├── BootScene.ts    # preload assets (textures générées)
        ├── MenuScene.ts    # écran titre + instructions
        ├── GameScene.ts    # scène principale de jeu
        └── UIScene.ts      # HUD (monde actuel, niveau, deaths)
```

---

## 🎯 MVP — Fonctionnalités à implémenter

### ✅ OBLIGATOIRE (MVP)

- [ ] Setup Phaser 3 + TypeScript + Vite fonctionnel
- [ ] Player : déplacement gauche/droite + saut (Arcade Physics)
- [ ] World switch : touche `F` — toggle PAST ↔ FUTURE
- [ ] Tilemap en code : deux couches de plateformes par niveau (past_tiles / future_tiles)
- [ ] Effet de transition : screen flash + camera shake bref + tween couleur de fond
- [ ] Détection de mort : chute hors écran → respawn au checkpoint
- [ ] 3 niveaux progressifs
- [ ] Scène Menu + Scène GameOver
- [ ] HUD : indicateur du monde actuel (icône / texte)

### ⏳ POST-MVP (ne pas implémenter maintenant)

- Ennemis (gardes / drones)
- Musique ambiante par monde
- Tiled map editor
- Leaderboard / timer speedrun
- Publication itch.io

---

## 🌍 Définition des deux mondes

```typescript
// constants.ts
export const WORLDS = {
  PAST: {
    id: 'past',
    label: '🏚️ PASSÉ',
    bgColor: 0x1a1008,       // brun très sombre
    platformColor: 0x8B6914, // ocre/marron
    accentColor: 0xD4A017,   // doré chaud
    flashColor: 0xFFD700,
  },
  FUTURE: {
    id: 'future',
    label: '⚡ FUTUR',
    bgColor: 0x020818,       // bleu nuit profond
    platformColor: 0x0A4A7A, // bleu acier
    accentColor: 0x00F5FF,   // cyan néon
    flashColor: 0x00F5FF,
  }
} as const;

export const TILE_SIZE = 32;
export const SWITCH_KEY = 'F';
export const SWITCH_COOLDOWN_MS = 400; // anti-spam switch
```

---

## 🗺️ Format des niveaux

Chaque niveau est défini par deux grilles 2D : une pour le PASSÉ, une pour le FUTUR.
`1` = plateforme solide, `0` = vide, `S` = spawn joueur, `E` = sortie (fin du niveau).

```typescript
// levels/level1.ts
export const level1 = {
  width: 25,   // en tiles
  height: 14,  // en tiles
  past: [
    // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
    [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // 0
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // 1
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // 2
    [  1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // 3
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // 4
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // 5
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ], // 6
    [ 'S',0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,'E', 1 ], // 7 (ligne de spawn)
    [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1 ], // 8 (sol avec trous)
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ], // 9
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ], // 10
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ], // 11
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ], // 12
    [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // 13
  ],
  future: [
    // Même dimensions, plateformes DIFFÉRENTES — là où past est vide, future peut être plein
    [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1 ],
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [ 'S',0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,'E', 1 ],
    [  1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // trous différents
    [  1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1 ],
    [  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],
  ]
};
```

Créer level2.ts et level3.ts avec des designs plus complexes (hauteurs variables, sauts obligatoires entre mondes, passages étroits).

---

## 👤 Classe Player

```typescript
// objects/Player.ts — logique attendue
class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { up: Key, left: Key, right: Key };
  private canJump: boolean = false;
  private jumpCount: number = 0;   // max 1 saut en l'air
  
  // États
  isAlive: boolean = true;
  spawnX: number;
  spawnY: number;

  update(): void {
    // Déplacement horizontal (vitesse : 180px/s)
    // Saut (vélocité : -420) — max 1 jump en l'air
    // Animation : idle / run / jump / fall
    // Interdit de bouger si !isAlive
  }

  die(): void {
    // Disable physics, jouer animation mort, tweener vers spawn après 800ms
  }
}
```

**Contrôles :**
- `←→` ou `A D` : déplacement
- `Space` ou `↑` ou `W` : saut
- `F` : switch de monde

---

## 🌀 WorldManager — Logique de switch

```typescript
// objects/WorldManager.ts
class WorldManager {
  private currentWorld: 'past' | 'future' = 'past';
  private cooldown: boolean = false;
  private pastGroup: Phaser.Physics.Arcade.StaticGroup;
  private futureGroup: Phaser.Physics.Arcade.StaticGroup;

  switch(scene: GameScene): void {
    if (this.cooldown) return;
    
    // 1. Vérifier que le joueur ne sera pas inside un mur après switch (AABB check)
    // 2. Si safe : toggle currentWorld
    // 3. Activer/désactiver les StaticGroups correspondants
    // 4. Lancer l'effet visuel (flash + shake + tween bgColor)
    // 5. Démarrer cooldown (400ms)
  }

  private isSwitchSafe(player: Player): boolean {
    // Vérifier overlap joueur avec le groupe cible
    // Retourner false si overlap → bloquer le switch
  }

  private playTransitionEffect(scene: GameScene): void {
    // scene.cameras.main.flash(150, r, g, b)
    // scene.cameras.main.shake(100, 0.005)
    // Tween bgColor de l'ancien vers le nouveau monde
  }
}
```

**Important :** le switch est **bloqué** si le joueur se retrouverait à l'intérieur d'un tile solide après le switch. Afficher un bref effet "denied" (flash rouge rapide) dans ce cas.

---

## 🎨 Rendu des tiles (sans assets externes)

Pour le MVP, les textures sont générées programmatiquement dans BootScene via `scene.make.graphics()` puis converties en texture avec `generateTexture()`.

```typescript
// BootScene.ts — générer les textures au boot
createPastTile(): void {
  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x8B6914);
  g.fillRect(0, 0, 32, 32);
  g.lineStyle(1, 0xD4A017, 0.4);
  g.strokeRect(0, 0, 32, 32);
  // Ajouter détails : craquelures, grain
  g.generateTexture('tile_past', 32, 32);
  g.destroy();
}

createFutureTile(): void {
  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x0A4A7A);
  g.fillRect(0, 0, 32, 32);
  g.lineStyle(1, 0x00F5FF, 0.6);
  g.strokeRect(0, 0, 32, 32);
  // Ajouter détails : lignes circuit, glow
  g.generateTexture('tile_future', 32, 32);
  g.destroy();
}
```

Même approche pour le joueur (rectangle arrondi de couleur neutre, 20x28px).

---

## 🖥️ Scènes

### BootScene
- Générer toutes les textures (tile_past, tile_future, player, exit_past, exit_future)
- Lancer MenuScene

### MenuScene
- Titre "RIFT" en grand (font monospace, effet glitch CSS ou Phaser text)
- Sous-titre : "PASSÉ · FUTUR · UN SEUL RIFT"
- `[ENTRÉE] JOUER` — `[F] CHANGER DE MONDE`
- Background : moitié gauche couleur PAST, moitié droite couleur FUTURE, ligne centrale animée

### GameScene
- Construire le niveau depuis le tableau LevelData
- Lancer UIScene en parallèle (`this.scene.launch('UIScene')`)
- Gérer les collisions player ↔ past_group / future_group selon monde actuel
- Détection sortie (trigger zone sur tile 'E')
- Transition vers niveau suivant (fade out → fade in)
- Si dernier niveau → GameOver/Win

### UIScene
- En overlay (transparent)
- Coin haut gauche : indicateur monde (`🏚️ PASSÉ` ou `⚡ FUTUR`) avec couleur correspondante
- Coin haut droite : numéro de niveau (`NIVEAU 1/3`)
- Effet de pulse sur l'indicateur au moment du switch

---

## 📐 Configuration Phaser

```typescript
// main.ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 448,      // 25 tiles × 32px (width), 14 tiles × 32px (height)
  backgroundColor: '#1a1008',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 },
      debug: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};
```

---

## ⚙️ Configuration Vite + TypeScript

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: { outDir: 'dist' }
});
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

---

## 🚀 Instructions d'initialisation

Exécuter dans l'ordre :

```bash
mkdir rift && cd rift
git init
npm create vite@latest . -- --template vanilla-ts
npm install phaser
```

Créer immédiatement les fichiers de config projet avant tout le reste :

### 1. `.gitignore`

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Build output
dist/
dist-ssr/
build/

# Vite cache
.vite/
*.local

# Env files
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor / OS
.DS_Store
Thumbs.db
.idea/
.vscode/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# TypeScript
*.tsbuildinfo

# Testing (post-MVP)
coverage/
```

### 2. `README.md`

```markdown
# RIFT

> A 2D platformer where you switch between two versions of the same level.

🏚️ **PAST** ↔ ⚡ **FUTURE** — Press `F` to shift between worlds.  
Platforms are inverted across timelines. What blocks you in one world, lets you pass in the other.

## Play

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Controls

| Key | Action |
|-----|--------|
| `← →` / `A D` | Move |
| `Space` / `↑` / `W` | Jump |
| `F` | Switch world |

## Build

```bash
npm run build
```

Output in `dist/` — ready for itch.io or static hosting.

## Stack

- [Phaser 3](https://phaser.io/) — game framework
- TypeScript + Vite — tooling

## License

MIT
` ``

### 3. Lancer le dev server

```bash
git add .
git commit -m "chore: init project — Phaser 3 + Vite + TS"
npm run dev
```

> ⚠️ **Règle commits :** Ne jamais inclure `Co-authored-by: Claude` ni aucune mention de Claude dans les messages de commit. Les commits doivent être propres et neutres.

Puis créer l'arborescence `src/` telle que définie ci-dessus et implémenter dans cet ordre :
1. `constants.ts` + `types.ts`
2. `BootScene.ts` (textures)
3. `Player.ts`
4. `WorldManager.ts`
5. `levels/level1.ts` (+ 2 et 3)
6. `GameScene.ts`
7. `MenuScene.ts` + `UIScene.ts`
8. `main.ts`

---

## ✅ Critères de validation MVP

- [ ] Le jeu se lance sur `localhost:5173` sans erreur console
- [ ] Le joueur se déplace et saute correctement
- [ ] La touche `F` switche le monde avec effet visuel visible
- [ ] Les tiles du monde inactif disparaissent / celles du monde actif apparaissent
- [ ] Le switch est bloqué si ça tuerait le joueur (overlap check)
- [ ] Tomber hors du niveau respawn le joueur au point de départ
- [ ] Atteindre la sortie charge le niveau suivant
- [ ] Après le niveau 3 → écran de fin
- [ ] L'HUD affiche le monde actuel correctement

---

## 📝 Notes pour les prochaines sessions

- Ajouter `DEVLOG_NEXT.md` avec les features post-MVP à chaque fin de session
- Le repo GitHub sera sous `Hugodlg91/rift` (display: VladimirWRLD)
- Penser à un `README.md` avec gif de gameplay pour itch.io
- Prévoir un `index.html` propre pour hébergement sur `vladimirwrld.com/rift`