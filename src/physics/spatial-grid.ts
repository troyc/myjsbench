import { Entity } from '../ecs/components.js';

// Spatial Grid for efficient collision detection
export class SpatialGrid {
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