# Design Document

## Overview

MyJSBench is a physics simulation benchmark built with TypeScript and PixiJS. The application uses an Entity Component System (ECS) architecture where entities are composed of optional components (Body, HP, Payload). The simulation runs at a configurable tick rate (30 or 120 Hz) with optional smooth rendering for interpolated visuals. A spatial grid optimizes collision detection for scalability.

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│  - UI Controls (buttons)                │
│  - Performance Metrics Display          │
│  - Main Loop (requestAnimationFrame)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Simulation Layer               │
│  - World (entity container)             │
│  - Tick Management                      │
│  - Smooth Rendering Logic               │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           Physics Layer                 │
│  - Entity Updates                       │
│  - Collision Detection (Spatial Grid)   │
│  - Collision Resolution                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Rendering Layer                │
│  - PixiJS Application                   │
│  - Graphics Objects (circles)           │
│  - Text Display (FPS, Tick Time)        │
└─────────────────────────────────────────┘
```

### Main Loop Flow

1. Calculate elapsed time since last frame
2. Accumulate time for fixed timestep updates
3. While accumulated time >= tick interval:
   - Update all entities (physics)
   - Resolve collisions using spatial grid
   - Subtract tick interval from accumulated time
4. If smooth rendering enabled:
   - Clone world state
   - Run partial tick with remaining time
   - Render cloned state
   - Discard clone
5. Else render current world state
6. Update performance metrics (FPS, tick time)

## Components and Interfaces

### Entity Component System

```typescript
class Body {
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public radius: number
  ) {}
}

class HP {
  constructor(
    public current: number,
    public max: number
  ) {}
}

class Payload {
  constructor(
    public type: string,
    public damage: number
  ) {}
}

class Entity {
  constructor(
    public body?: Body,
    public hp?: HP,
    public payload?: Payload
  ) {}
}
```

### World Class

```typescript
class World {
  entities: Entity[] = [];
  width: number = 1600;
  height: number = 1200;
  spatialGrid: SpatialGrid;

  constructor() {
    this.spatialGrid = new SpatialGrid(this.width, this.height, cellSize);
  }

  addEntity(entity: Entity): void
  removeEntities(count: number): void
  update(deltaTime: number): void
  clone(): World
}
```

### Spatial Grid

```typescript
class SpatialGrid {
  private cells: Map<string, Entity[]>;
  private cellSize: number;
  private cols: number;
  private rows: number;

  constructor(width: number, height: number, cellSize: number)
  clear(): void
  insert(entity: Entity): void
  query(entity: Entity): Entity[]
  getEntitiesInRadius(x: number, y: number, radius: number): Entity[]
  private getCellKey(x: number, y: number): string
  private getCellsForEntity(entity: Entity): string[]
}
```

The spatial grid divides the world into a grid of cells. Each entity is inserted into all cells it overlaps. When querying for potential collisions, only entities in the same or adjacent cells are returned, reducing collision checks from O(n²) to approximately O(n). The `getEntitiesInRadius` method allows querying entities within a circular area.

### Application State

```typescript
interface AppState {
  renderEnabled: boolean;
  tickRate: 30 | 120;
  smoothEnabled: boolean;
  lastTime: number;
  accumulator: number;
  fps: number;
  tickTime: number;
}
```

## Data Models

### Entity Initialization

When creating new entities:
- Position: Random x ∈ [0, width], y ∈ [0, height]
- Velocity: Random angle θ ∈ [0, 2π], speed = 64 px/s
  - vx = 64 * cos(θ)
  - vy = 64 * sin(θ)
- Radius: 8 pixels
- Collision check: Attempt to place without collisions for up to 100 tries. After 100 attempts, spawn at the random position even if colliding.

### Physics Calculations

**Position Update:**
```
x_new = x_old + vx * deltaTime
y_new = y_old + vy * deltaTime
```

**Wall Collision:**
```
if (x - radius < 0 || x + radius > width):
  vx = -vx
  clamp x to valid range

if (y - radius < 0 || y + radius > height):
  vy = -vy
  clamp y to valid range
```

**Elastic Collision Between Two Balls:**

For entities A and B:
1. Calculate collision normal: n = normalize(B.pos - A.pos)
2. Calculate relative velocity: v_rel = A.vel - B.vel
3. Calculate velocity along normal: v_n = dot(v_rel, n)
4. If v_n > 0, balls are separating (skip)
5. Calculate impulse: j = -(1 + restitution) * v_n / 2
6. Apply impulse:
   - A.vel += j * n
   - B.vel -= j * n
7. Separate overlapping balls:
   - overlap = (A.radius + B.radius) - distance
   - A.pos -= n * overlap / 2
   - B.pos += n * overlap / 2

For this benchmark, restitution = 1.0 (perfectly elastic).

## Error Handling

### Collision Detection Edge Cases

- **Overlapping spawns:** When adding entities, retry random placement up to 100 times. After 100 attempts, spawn the entity at the random position even if it overlaps with existing entities.
- **High-speed tunneling:** Not addressed in initial implementation (entities move slowly enough at 64 px/s).
- **Numerical instability:** Clamp positions to valid ranges after updates.

### UI State Management

- Button states are toggled atomically
- Rendering can be disabled without affecting physics
- Tick rate changes take effect on next tick
- Smooth rendering always succeeds (world cloning is a simple deep copy operation)

## Testing Strategy

### Unit Tests

- **Entity creation:** Verify Body, HP, Payload components initialize correctly
- **Spatial grid:** Test insertion, querying, and cell key generation
- **Collision detection:** Verify correct collision pairs are identified
- **Physics calculations:** Test elastic collision math with known inputs/outputs

### Integration Tests

- **World update:** Verify entities move correctly over multiple ticks
- **Ball spawning:** Ensure new balls don't overlap existing ones
- **Button interactions:** Test each button toggles correct state
- **Performance metrics:** Verify FPS and tick time calculations are reasonable

### Visual/Manual Tests

- Run simulation and verify balls bounce realistically
- Test smooth rendering produces smoother motion
- Verify performance metrics update in real-time
- Test with varying ball counts (4, 8, 16, 32, 64, 128, etc.)

## Implementation Notes

### PixiJS Setup

- Create PixiJS Application with 1600x1200 canvas
- Use Graphics objects for circles (reuse for performance)
- Use Text objects for FPS and tick time display
- Clear and redraw each frame when rendering enabled

### Performance Considerations

- Spatial grid cell size should be approximately 2-3x the ball radius for optimal performance
- Reuse PixiJS Graphics objects instead of creating new ones each frame
- Consider object pooling for entity creation/destruction
- Profile with browser DevTools to identify bottlenecks

### Future Extensions

The HP and Payload components are defined but not used in the initial implementation. These could support:
- Ball health that decreases on collision
- Different ball types with varying damage
- Visual indicators for health (color changes)
- Ball destruction when health reaches zero
