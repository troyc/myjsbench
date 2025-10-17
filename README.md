# MyJSBench

A tiny TypeScript + PixiJS physics toy for stress‑testing entity updates and simple collision resolution in the browser. Features a spatial grid, adjustable tick rates, and a lightweight HUD for live performance metrics. As you may have noticed, this project involved the gratuitous use of AI because troyc is a lazy developer.

## Features
- Bouncing circle entities with elastic collisions
- Spatial grid broadphase (cell size adjustable)
- Scale‑aware grid overlay (transparent gray)
- Fixed timestep game loop with optional smooth render interpolation
- Live HUD: FPS, latest tick time, 1s average tick time, Max TPS
- Simple UI to change counts, radii, tick rate, rendering, and grid size

## Controls
- `- (Halve Balls)`: remove half the entities
- `+ (Double Balls)`: add the current count again
- `R- / R+`: decrease/increase entity radius
- `Render`: toggle rendering on/off
- `Tick`: toggle fixed tick rate (30 / 120)
- `Smooth`: toggle smooth interpolation of rendering
- `Cell - / Cell +`: decrease/increase spatial grid cell size by 8px
- Grid info line shows current cell size and total cells

## Performance Metrics
- HUD shows `Tick: <latest> ms (<avg 1s> ms avg 1s)`
- `Max TPS` is computed from the 1‑second rolling average tick time

## Getting Started
Requirements: Node 18+

```bash
npm install
npm run dev
```
Then open the printed local URL from Vite.

Type‑check only:
```bash
npm run typecheck
```

## Project Structure
- `src/main.ts`: Vite entry that bootstraps the harness
- `src/GameSimulation/`: pure simulation core (entities, spatial grid, world, commands)
- `src/harness/bootstrap.ts`: wires the simulation, renderer, controls, and runner
- `src/harness/simulation-runner.ts`: fixed timestep controller with smoothing support
- `src/harness/renderer.ts`: PixiJS renderer + HUD + grid overlay (consumes simulation state)
- `src/harness/controls.ts`: DOM wiring for UI buttons and command dispatch
- `src/harness/app-state.ts`: shared app state for runner + UI
- `index.html`: controls and canvas container
