import { Entity, Body, HP, Payload } from '../ecs/components.js';
import { SpatialGrid } from './spatial-grid.js';

// World class for entity management
export class World {
  entities: Entity[] = [];
  width: number = 2500;
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
    const checkedPairs = new Set<bigint>();

    for (const entityA of this.entities) {
      if (!entityA.body) continue;

      const nearby = this.spatialGrid.query(entityA);

      for (const entityB of nearby) {
        if (!entityB.body) continue;

        // Create unique pair key to avoid checking same pair twice
        const idA = entityA.id;
        const idB = entityB.id;
        const minId = idA < idB ? idA : idB;
        const maxId = idA < idB ? idB : idA;
        const pairKey = (BigInt(minId) << 32n) | BigInt(maxId);

        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        // Check for collision using squared distance first (avoid sqrt)
        const bodyA = entityA.body;
        const bodyB = entityB.body;
        const dx = bodyB.x - bodyA.x;
        const dy = bodyB.y - bodyA.y;
        const d2 = dx * dx + dy * dy;
        const minDist = bodyA.radius + bodyB.radius;
        const minDist2 = minDist * minDist;

        if (d2 < minDist2 && d2 > 0) {
          const distance = Math.sqrt(d2);

          // Collision detected - resolve with elastic collision
          const nx = dx / distance;
          const ny = dy / distance;

          // Relative velocity
          const dvx = bodyA.vx - bodyB.vx;
          const dvy = bodyA.vy - bodyB.vy;

          // Velocity along collision normal
          const vn = dvx * nx + dvy * ny;

          // Only resolve if entities are moving towards each other
          if (vn > 0) {
            // Impulse for elastic collision (restitution = 1.0)
            const impulse = vn;

            // Apply impulse
            bodyA.vx -= impulse * nx;
            bodyA.vy -= impulse * ny;
            bodyB.vx += impulse * nx;
            bodyB.vy += impulse * ny;

            // Separate overlapping entities
            const overlap = minDist - distance;
            const half = 0.5;
            const separationX = nx * overlap * half;
            const separationY = ny * overlap * half;

            bodyA.x -= separationX;
            bodyA.y -= separationY;
            bodyB.x += separationX;
            bodyB.y += separationY;
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
      const clonedEntity = new Entity(undefined, undefined, undefined, entity.id);

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
