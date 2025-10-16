import { Entity } from '../ecs/components.js';

// Spatial Grid for efficient collision detection
interface CellCoord {
  col: number;
  row: number;
}

export class SpatialGrid {
  private cells: Map<number, Map<number, Entity[]>>;
  private readonly cellSize: number;
  private readonly cellSizeInv: number;

  constructor(_width: number, _height: number, cellSize: number) {
    this.cellSize = cellSize;
    this.cellSizeInv = 1 / cellSize;
    this.cells = new Map<number, Map<number, Entity[]>>();
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: Entity): void {
    const body = entity.body;
    if (!body) return;

    const cellCoords = this.getCellsForEntity(body.x, body.y, body.radius);
    for (const { col, row } of cellCoords) {
      let column = this.cells.get(col);
      if (!column) {
        column = new Map<number, Entity[]>();
        this.cells.set(col, column);
      }

      let bucket = column.get(row);
      if (!bucket) {
        bucket = [];
        column.set(row, bucket);
      }

      bucket.push(entity);
    }
  }

  query(entity: Entity): Entity[] {
    const body = entity.body;
    if (!body) return [];

    const nearbyEntities = new Set<Entity>();
    const visitedCells = new Set<string>();
    const cellCoords = this.getCellsForEntity(body.x, body.y, body.radius);

    for (const { col, row } of cellCoords) {
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const neighborCol = col + dc;
          const neighborRow = row + dr;
          const key = this.encodeCell(neighborCol, neighborRow);

          if (visitedCells.has(key)) continue;
          visitedCells.add(key);

          const column = this.cells.get(neighborCol);
          if (!column) continue;

          const bucket = column.get(neighborRow);
          if (!bucket) continue;

          for (const other of bucket) {
            if (other !== entity) {
              nearbyEntities.add(other);
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
    const minCol = Math.floor((x - radius) * this.cellSizeInv);
    const maxCol = Math.floor((x + radius) * this.cellSizeInv);
    const minRow = Math.floor((y - radius) * this.cellSizeInv);
    const maxRow = Math.floor((y + radius) * this.cellSizeInv);

    for (let col = minCol; col <= maxCol; col++) {
      const column = this.cells.get(col);
      if (!column) continue;

      for (let row = minRow; row <= maxRow; row++) {
        const bucket = column.get(row);
        if (!bucket) continue;

        for (const entity of bucket) {
          const body = entity.body;
          if (!body) continue;

          const dx = body.x - x;
          const dy = body.y - y;
          const distSquared = dx * dx + dy * dy;

          if (distSquared <= radiusSquared) {
            entitiesInRadius.push(entity);
          }
        }
      }
    }

    return entitiesInRadius;
  }

  private encodeCell(col: number, row: number): string {
    return `${col},${row}`;
  }

  private getCellsForEntity(x: number, y: number, radius: number): CellCoord[] {
    const minCol = Math.floor((x - radius) * this.cellSizeInv);
    const maxCol = Math.floor((x + radius) * this.cellSizeInv);
    const minRow = Math.floor((y - radius) * this.cellSizeInv);
    const maxRow = Math.floor((y + radius) * this.cellSizeInv);

    const coords: CellCoord[] = [];
    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        coords.push({ col, row });
      }
    }

    return coords;
  }
}
