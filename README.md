# 🌳 EcoMoji

An emoji ecosystem simulator. Build a world on a tile grid using plant, animal, and environment emoji, then watch food chains, populations, and ecological balance play out.

The whole game is **data-driven**: species, modes, and balance numbers live in JSON files under `public/config/`. Edit a file, refresh the browser, and the change is live — **no rebuild required**.

## Run

```bash
npm install
npm run dev
```

Open the printed localhost URL.

```bash
npm run build      # type-check + production bundle
npm run preview    # serve the production build
```

## Play

1. Pick a mode on the start screen:
   - **Sandbox** — build freely, no end condition.
   - **Days Survived** — last as long as you can; ends when all life dies.
   - **Biodiversity** — keep plants, herbivores, and carnivores all alive.
2. In the game screen, click an entity in the left palette, then click a tile to place it. Pick **🧽 Erase** to remove.
3. Press **▶ Play** and watch the ecosystem evolve. Use **1× / 2× / 4×** to change speed, or **⏭ Step** while paused.

## Modding — extending the game without recompiling

Everything that defines the game world is JSON in `public/config/`. Edit, save, refresh the browser tab — that's the whole loop.

### Folder layout

```
public/config/
  pack.json              ← manifest: lists all species and mode files
  species/
    plants.json
    herbivores.json
    carnivores.json
    environment.json
  modes/
    sandbox.json
    days.json
    biodiversity.json
```

### Add a new species

Append a record (or a whole new file) and reference it from `pack.json`:

```json
{
  "id": "bee",
  "emoji": "🐝",
  "label": "Bee",
  "group": "herbivore",
  "role": "consumer",
  "placeable": true,
  "diet": ["sapling", "bush"],
  "energyStart": 6, "energyPerEat": 4, "energyPerTick": 1,
  "reproThreshold": 12, "lifespan": 40, "speed": 1
}
```

The bee shows up automatically in the palette and the populations panel.

### Species fields

| Field | Used by | Meaning |
|---|---|---|
| `id` | all | unique key |
| `emoji`, `label` | all | display |
| `group` | all | `plant` / `herbivore` / `carnivore` / `environment` (drives stats grouping) |
| `role` | all | `producer` / `consumer` / `environment` (chooses which built-in behavior runs) |
| `placeable` | all | show in the palette |
| `terrain` | environment | `grass` / `water` / `rock` (sets tile terrain when placed) |
| `blocksPlacement` | environment | players can't place living things on it |
| `needs.sun`, `needs.waterNeighbor` | producers | growth requirements |
| `spreadChance` | producers | per-tick chance to spawn into a neighbor |
| `matureAge`, `growsInto` | producers | age before spreading; species id this one becomes after maturing |
| `lifespan` | producers, consumers | dies after this many ticks |
| `diet` | consumers | array of species ids this one eats |
| `energyStart`, `energyPerEat`, `energyPerTick` | consumers | starting energy, gain per kill, cost per tick |
| `reproThreshold` | consumers | reproduce when energy ≥ this |
| `behaviors` | any | array of custom behavior ids registered via `window.EcoMoji.registerBehavior` |

### Add a new mode

Drop a JSON file in `public/config/modes/` and reference it from `pack.json`:

```json
{
  "id": "rabbit-rush",
  "label": "Rabbit Rush",
  "description": "Reach 50 rabbits to win.",
  "endWhen": { "speciesReaches": { "id": "rabbit", "count": 50 } },
  "score": "days"
}
```

Supported `endWhen` predicates:
- `{ "never": true }`
- `{ "allLifeExtinct": true }`
- `{ "anyGroupReachesZero": ["plant", "herbivore", "carnivore"] }`
- `{ "speciesReaches": { "id": "<id>", "count": <n> } }`
- `{ "dayReaches": <n> }`

### Tune balance (no rebuild)

Open `public/config/species/herbivores.json`, change `reproThreshold` from 14 to 6, refresh the browser — rabbits now multiply much faster. The dev server doesn't even need restarting.

### Import / export packs in-browser

- **Import pack…** on the start screen merges a local JSON file on top of the active pack (in memory only).
- **Export pack** downloads the merged pack as a single JSON file you can share or check in.

### Load a custom pack via URL

```
http://localhost:5173/?pack=https://example.com/my-pack/pack.json
```

### Custom behaviors (rare — only if a new species needs new mechanics)

Drop a JS file (e.g. `public/config/scripts/pollinate.js`) that registers a behavior:

```js
window.EcoMoji.registerBehavior('pollinate', (ctx) => {
  // return an array of Update objects
  return [];
});
```

List the script in `pack.json` under `scripts: ["/config/scripts/pollinate.js"]`. Reference it in any species via `"behaviors": ["pollinate"]`.

## Project layout

```
public/config/      ← all editable game data (JSON)
src/
  game/             ← engine: types, pack loader, registry, world, simulation, behaviors, endConditions, rng
  ui/               ← React components (renders entirely from the loaded registry)
  hooks/            ← useSimulation, usePack
  styles/app.css
```

The engine never hard-codes a species id. Everything you see in the palette, the grid, the stats panel, and the end conditions is read from JSON at runtime.
