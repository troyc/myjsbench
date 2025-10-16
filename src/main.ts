// MyJSBench - Physics Simulation Benchmark
// Entry point for the application

// ECS Component Classes
class Body {
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public radius: number
  ) { }
}

class HP {
  constructor(
    public current: number,
    public max: number
  ) { }
}

class Payload {
  constructor(
    public type: string,
    public damage: number
  ) { }
}

class Entity {
  constructor(
    public body?: Body,
    public hp?: HP,
    public payload?: Payload
  ) { }
}

// Spatial Grid for efficient collision detection
class SpatialGrid {
  private cells: Map<string, Entity[]>;
  private cellSize: number;

  constructor(_width: number, _height: number, cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map<string, Entity[]>();
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: Entity): void {
    if (!entity.body) return;

    const cellKeys = this.getCellsForEntity(entity);
    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key)!.push(entity);
    }
  }

  query(entity: Entity): Entity[] {
    if (!entity.body) return [];

    const nearbyEntities = new Set<Entity>();
    const cellKeys = this.getCellsForEntity(entity);

    for (const key of cellKeys) {
      const [col, row] = key.split(',').map(Number);

      // Check same cell and adjacent cells
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const adjacentKey = this.getCellKey(col + dc, row + dr);
          const entitiesInCell = this.cells.get(adjacentKey);

          if (entitiesInCell) {
            for (const e of entitiesInCell) {
              if (e !== entity) {
                nearbyEntities.add(e);
              }
            }
          }
        }
      }
    }

    return Array.from(nearbyEntities);
  }

  getEntitiesInRadius(x: number, y: number, radius: number): Entity[] {
    const entitiesInRadius: Entity[] = [];
    const radiusSquared = radius * radius;

    // Determine which cells to check
    const minCol = Math.floor((x - radius) / this.cellSize);
    const maxCol = Math.floor((x + radius) / this.cellSize);
    const minRow = Math.floor((y - radius) / this.cellSize);
    const maxRow = Math.floor((y + radius) / this.cellSize);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = this.getCellKey(col, row);
        const entitiesInCell = this.cells.get(key);

        if (entitiesInCell) {
          for (const entity of entitiesInCell) {
            if (!entity.body) continue;

            const dx = entity.body.x - x;
            const dy = entity.body.y - y;
            const distSquared = dx * dx + dy * dy;

            if (distSquared <= radiusSquared) {
              entitiesInRadius.push(entity);
            }
          }
        }
      }
    }

    return entitiesInRadius;
  }

  private getCellKey(col: number, row: number): string {
    return `${col},${row}`;
  }

  private getCellsForEntity(entity: Entity): string[] {
    if (!entity.body) return [];

    const { x, y, radius } = entity.body;
    const minCol = Math.floor((x - radius) / this.cellSize);
    const maxCol = Math.floor((x + radius) / this.cellSize);
    const minRow = Math.floor((y - radius) / this.cellSize);
    const maxRow = Math.floor((y + radius) / this.cellSize);

    const keys: string[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        keys.push(this.getCellKey(col, row));
      }
    }

    return keys;
  }
}

// World class for entity management
class World {
  entities: Entity[] = [];
  width: number = 1600;
  height: number = 1200;
  spatialGrid: SpatialGrid;

  constructor() {
    // Cell size of 24 pixels (3x the ball radius of 8)
    this.spatialGrid = new SpatialGrid(this.width, this.height, 24);
  }

  addEntity(entity: Entity): void {
    if (!entity.body) {
      this.entities.push(entity);
      return;
    }

    const radius = entity.body.radius;
    let placed = false;

    // Try up to 100 times to find a non-colliding position
    for (let attempt = 0; attempt < 100; attempt++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;

      // Check if this position collides with any existing entity
      let collides = false;
      for (const other of this.entities) {
        if (!other.body) continue;

        const dx = x - other.body.x;
        const dy = y - other.body.y;
        const minDist = radius + other.body.radius;

        if (dx * dx + dy * dy < minDist * minDist) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        entity.body.x = x;
        entity.body.y = y;
        placed = true;
        break;
      }
    }

    // After 100 attempts, force spawn at the last random position
    if (!placed) {
      entity.body.x = Math.random() * this.width;
      entity.body.y = Math.random() * this.height;
    }

    this.entities.push(entity);
  }

  removeEntities(): void {
    const halfCount = Math.floor(this.entities.length / 2);
    this.entities = this.entities.slice(0, halfCount);
  }

  update(deltaTime: number): void {
    // Clear spatial grid
    this.spatialGrid.clear();

    // Update entity positions and insert into spatial grid
    for (const entity of this.entities) {
      if (!entity.body) continue;

      // Update position based on velocity
      entity.body.x += entity.body.vx * deltaTime;
      entity.body.y += entity.body.vy * deltaTime;

      // Wall collision detection and reflection
      const radius = entity.body.radius;

      if (entity.body.x - radius < 0) {
        entity.body.x = radius;
        entity.body.vx = Math.abs(entity.body.vx);
      } else if (entity.body.x + radius > this.width) {
        entity.body.x = this.width - radius;
        entity.body.vx = -Math.abs(entity.body.vx);
      }

      if (entity.body.y - radius < 0) {
        entity.body.y = radius;
        entity.body.vy = Math.abs(entity.body.vy);
      } else if (entity.body.y + radius > this.height) {
        entity.body.y = this.height - radius;
        entity.body.vy = -Math.abs(entity.body.vy);
      }

      // Insert into spatial grid
      this.spatialGrid.insert(entity);
    }

    // Resolve collisions between entities
    const checkedPairs = new Set<string>();

    for (const entityA of this.entities) {
      if (!entityA.body) continue;

      const nearby = this.spatialGrid.query(entityA);

      for (const entityB of nearby) {
        if (!entityB.body) continue;

        // Create unique pair key to avoid checking same pair twice
        const pairKey = entityA < entityB
          ? `${this.entities.indexOf(entityA)},${this.entities.indexOf(entityB)}`
          : `${this.entities.indexOf(entityB)},${this.entities.indexOf(entityA)}`;

        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        // Check for collision
        const dx = entityB.body.x - entityA.body.x;
        const dy = entityB.body.y - entityA.body.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDist = entityA.body.radius + entityB.body.radius;

        if (distance < minDist && distance > 0) {
          // Collision detected - resolve with elastic collision
          const nx = dx / distance;
          const ny = dy / distance;

          // Relative velocity
          const dvx = entityA.body.vx - entityB.body.vx;
          const dvy = entityA.body.vy - entityB.body.vy;

          // Velocity along collision normal
          const vn = dvx * nx + dvy * ny;

          // Only resolve if entities are moving towards each other
          if (vn > 0) {
            // Impulse for elastic collision (restitution = 1.0)
            const impulse = vn;

            // Apply impulse
            entityA.body.vx -= impulse * nx;
            entityA.body.vy -= impulse * ny;
            entityB.body.vx += impulse * nx;
            entityB.body.vy += impulse * ny;

            // Separate overlapping entities
            const overlap = minDist - distance;
            const separationX = nx * overlap / 2;
            const separationY = ny * overlap / 2;

            entityA.body.x -= separationX;
            entityA.body.y -= separationY;
            entityB.body.x += separationX;
            entityB.body.y += separationY;
          }
        }
      }
    }
  }

  clone(): World {
    const cloned = new World();
    cloned.width = this.width;
    cloned.height = this.height;

    // Deep copy entities
    for (const entity of this.entities) {
      const clonedEntity = new Entity();

      if (entity.body) {
        clonedEntity.body = new Body(
          entity.body.x,
          entity.body.y,
          entity.body.vx,
          entity.body.vy,
          entity.body.radius
        );
      }

      if (entity.hp) {
        clonedEntity.hp = new HP(entity.hp.current, entity.hp.max);
      }

      if (entity.payload) {
        clonedEntity.payload = new Payload(entity.payload.type, entity.payload.damage);
      }

      cloned.entities.push(clonedEntity);
    }

    return cloned;
  }
}

// PixiJS Application Setup
import { Application, Graphics, Text, TextStyle } from 'pixi.js';

// Create PixiJS Application with 1600x1200 canvas
const app = new Application({
  width: 1600,
  height: 1200,
  backgroundColor: 0xffffff,
});

// Append canvas to container
const canvasContainer = document.getElementById('canvas-container');
if (canvasContainer) {
  canvasContainer.appendChild(app.view as HTMLCanvasElement);
}

// Graphics objects pool for rendering ball circles
const graphicsPool: Graphics[] = [];

function getGraphics(): Graphics {
  if (graphicsPool.length > 0) {
    return graphicsPool.pop()!;
  }
  return new Graphics();
}

function returnGraphics(graphics: Graphics): void {
  graphics.clear();
  graphicsPool.push(graphics);
}

// Text objects for FPS and tick time display
const textStyle = new TextStyle({
  fontSize: 20,
  fill: 0x000000,
});

const fpsText = new Text('FPS: 0', textStyle);
fpsText.x = 10;
fpsText.y = 10;
app.stage.addChild(fpsText);

const tickTimeText = new Text('Tick: 0.00ms', textStyle);
tickTimeText.x = 10;
tickTimeText.y = 35;
app.stage.addChild(tickTimeText);

// Active graphics objects for current frame
let activeGraphics: Graphics[] = [];

// Render function to draw all entities as blue circles with black borders
export function render(world: World): void {
  // Return all active graphics to pool
  for (const graphics of activeGraphics) {
    app.stage.removeChild(graphics);
    returnGraphics(graphics);
  }
  activeGraphics = [];

  // Draw all entities
  for (const entity of world.entities) {
    if (!entity.body) continue;

    const graphics = getGraphics();
    
    // Draw blue circle with black border
    graphics.beginFill(0x0000ff); // Blue fill
    graphics.lineStyle(2, 0x000000); // Black border
    graphics.drawCircle(entity.body.x, entity.body.y, entity.body.radius);
    graphics.endFill();

    app.stage.addChild(graphics);
    activeGraphics.push(graphics);
  }
}

// Update performance metrics display
export function updateMetrics(fps: number, tickTime: number): void {
  fpsText.text = `FPS: ${Math.round(fps)}`;
  tickTimeText.text = `Tick: ${tickTime.toFixed(2)}ms`;
}

// AppState interface to track render, tick rate, smooth rendering, and timing state
interface AppState {
  renderEnabled: boolean;
  tickRate: 30 | 120;
  smoothEnabled: boolean;
  lastTime: number;
  accumulator: number;
  fps: number;
  tickTime: number;
}

// Initialize application state
const appState: AppState = {
  renderEnabled: true,
  tickRate: 30,
  smoothEnabled: false,
  lastTime: performance.now(),
  accumulator: 0,
  fps: 60,
  tickTime: 0,
};

// Initialize world
const world = new World();

// Main game loop with fixed timestep
function gameLoop(currentTime: number): void {
  // Calculate elapsed time since last frame (in seconds)
  const deltaTime = (currentTime - appState.lastTime) / 1000;
  appState.lastTime = currentTime;

  // Add elapsed time to accumulator
  appState.accumulator += deltaTime;

  // Calculate fixed timestep interval based on tick rate
  const tickInterval = 1 / appState.tickRate;

  // Process fixed timestep updates
  while (appState.accumulator >= tickInterval) {
    // Track tick start time
    const tickStart = performance.now();

    // Update world physics
    world.update(tickInterval);

    // Calculate tick time in milliseconds
    appState.tickTime = performance.now() - tickStart;

    // Subtract tick interval from accumulator
    appState.accumulator -= tickInterval;
  }

  // Render the world if rendering is enabled
  if (appState.renderEnabled) {
    if (appState.smoothEnabled) {
      // Smooth rendering: clone world state and run partial tick
      const clonedWorld = world.clone();
      
      // Calculate remaining time fraction
      const partialDeltaTime = appState.accumulator;
      
      // Run partial tick on cloned world
      clonedWorld.update(partialDeltaTime);
      
      // Render the interpolated cloned world state
      render(clonedWorld);
      
      // Cloned world is discarded after rendering (goes out of scope)
    } else {
      // Normal rendering: render current world state
      render(world);
    }
  }

  // Update FPS using exponential moving average
  const currentFps = 1 / deltaTime;
  appState.fps = appState.fps * 0.9 + currentFps * 0.1;

  // Update performance metrics display
  updateMetrics(appState.fps, appState.tickTime);

  // Continue the loop
  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

console.log('MyJSBench initialized');
