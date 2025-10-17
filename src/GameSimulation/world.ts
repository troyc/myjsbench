import { Entity, Body, HP, Payload } from './components.js';
import { SpatialGrid } from './spatial-grid.js';

export class World {
  entities: Entity[] = [];
  width = 2500;
  height = 1200;
  spatialGrid: SpatialGrid;

  constructor() {
    this.spatialGrid = new SpatialGrid(this.width, this.height, 24);
  }

  getGridCellSize(): number {
    return this.spatialGrid.getCellSize();
  }

  getGridCellCount(): number {
    return this.spatialGrid.getTotalCellCount();
  }

  setGridCellSize(cellSize: number): number {
    const minCellSize = 8;
    const maxCellSize = Math.max(this.width, this.height);
    const clampedSize = Math.min(Math.max(cellSize, minCellSize), maxCellSize);
    this.spatialGrid.setCellSize(clampedSize);
    return this.spatialGrid.getCellSize();
  }

  adjustGridCellSize(delta: number): number {
    const nextSize = this.spatialGrid.getCellSize() + delta;
    return this.setGridCellSize(nextSize);
  }

  addEntity(entity: Entity): void {
    if (!entity.body) {
      this.entities.push(entity);
      return;
    }

    const radius = entity.body.radius;
    let placed = false;

    for (let attempt = 0; attempt < 100; attempt++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;

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

  scaleRadii(factor: number): void {
    for (const entity of this.entities) {
      if (entity.body) {
        entity.body.radius *= factor;
      }
    }
  }

  update(deltaTime: number): void {
    this.spatialGrid.clear();

    for (const entity of this.entities) {
      if (!entity.body) continue;

      entity.body.x += entity.body.vx * deltaTime;
      entity.body.y += entity.body.vy * deltaTime;

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

      this.spatialGrid.insert(entity);
    }

    const checkedPairs = new Set<bigint>();

    for (const entityA of this.entities) {
      if (!entityA.body) continue;

      const nearby = this.spatialGrid.getEntitiesInRadius(
        entityA.body.x,
        entityA.body.y,
        entityA.body.radius,
        entityA.id
      );

      for (const entityB of nearby) {
        if (!entityB.body) continue;

        const idA = entityA.id;
        const idB = entityB.id;
        const minId = idA < idB ? idA : idB;
        const maxId = idA < idB ? idB : idA;
        const pairKey = (BigInt(minId) << 32n) | BigInt(maxId);

        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const bodyA = entityA.body;
        const bodyB = entityB.body;
        const dx = bodyB.x - bodyA.x;
        const dy = bodyB.y - bodyA.y;
        const d2 = dx * dx + dy * dy;
        const minDist = bodyA.radius + bodyB.radius;
        const minDist2 = minDist * minDist;

        if (d2 < minDist2 && d2 > 0) {
          const distance = Math.sqrt(d2);
          const nx = dx / distance;
          const ny = dy / distance;

        const dvx = bodyA.vx - bodyB.vx;
        const dvy = bodyA.vy - bodyB.vy;

        const vn = dvx * nx + dvy * ny;

        // Positional correction to resolve overlap
        const overlap = minDist - distance;
        if (overlap > 0) {
          const separationX = nx * overlap * 0.5;
          const separationY = ny * overlap * 0.5;
          bodyA.x -= separationX;
          bodyA.y -= separationY;
          bodyB.x += separationX;
          bodyB.y += separationY;
        }

        // Only apply velocity response if moving toward each other
        if (vn > 0) {
          const impulse = vn; // equal mass, elastic along normal
          bodyA.vx -= impulse * nx;
          bodyA.vy -= impulse * ny;
          bodyB.vx += impulse * nx;
          bodyB.vy += impulse * ny;
        }
      }
    }
  }
  }

  clone(): World {
    const cloned = new World();
    cloned.width = this.width;
    cloned.height = this.height;
    cloned.setGridCellSize(this.getGridCellSize());

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
