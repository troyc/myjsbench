import { Entity } from '../ecs/components.js';

// Spatial Grid for efficient collision detection (optimized)
interface Cell {
  items: Entity[];
  stamp: number;
}

export class SpatialGrid {
  private cells: Map<number, Cell>;
  private readonly cellSizeInv: number;
  private stamp: number;

  // Use a fixed offset to keep packed keys unique for small negative indices
  private static readonly OFFSET = 1 << 15; // 32768

  constructor(_width: number, _height: number, cellSize: number) {
    this.cellSizeInv = 1 / cellSize;
    this.cells = new Map<number, Cell>();
    this.stamp = 1;
  }

  // O(1) clear using a frame-stamp; buckets reset lazily on next touch
  clear(): void {
    this.stamp++;
    // Very long runs: occasionally reset to avoid overflow and memory bloat
    if (this.stamp === Number.MAX_SAFE_INTEGER) {
      this.cells.clear();
      this.stamp = 1;
    }
  }

  insert(entity: Entity): void {
    const body = entity.body;
    if (!body) return;

    const radius = body.radius;
    const minCol = Math.floor((body.x - radius) * this.cellSizeInv);
    const maxCol = Math.floor((body.x + radius) * this.cellSizeInv);
    const minRow = Math.floor((body.y - radius) * this.cellSizeInv);
    const maxRow = Math.floor((body.y + radius) * this.cellSizeInv);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = this.packKey(col, row);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = { items: [], stamp: 0 };
          this.cells.set(key, cell);
        }
        if (cell.stamp !== this.stamp) {
          cell.items.length = 0;
          cell.stamp = this.stamp;
        }
        cell.items.push(entity);
      }
    }
  }

  // Returns potential neighbors of the given entity by scanning a bounded region
  query(entity: Entity): Entity[] {
    const body = entity.body;
    if (!body) return [];

    const radius = body.radius;
    const minCol = Math.floor((body.x - radius) * this.cellSizeInv) - 1;
    const maxCol = Math.floor((body.x + radius) * this.cellSizeInv) + 1;
    const minRow = Math.floor((body.y - radius) * this.cellSizeInv) - 1;
    const maxRow = Math.floor((body.y + radius) * this.cellSizeInv) + 1;

    const seenIds = new Set<number>();
    const result: Entity[] = [];

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = this.packKey(col, row);
        const cell = this.cells.get(key);
        if (!cell || cell.stamp !== this.stamp) continue;

        const items = cell.items;
        for (let i = 0; i < items.length; i++) {
          const other = items[i];
          if (other === entity) continue;
          const id = other.id;
          if (!seenIds.has(id)) {
            seenIds.add(id);
            result.push(other);
          }
        }
      }
    }

    return result;
  }

  getEntitiesInRadius(x: number, y: number, radius: number): Entity[] {
    const result: Entity[] = [];
    const r2 = radius * radius;

    const minCol = Math.floor((x - radius) * this.cellSizeInv);
    const maxCol = Math.floor((x + radius) * this.cellSizeInv);
    const minRow = Math.floor((y - radius) * this.cellSizeInv);
    const maxRow = Math.floor((y + radius) * this.cellSizeInv);

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        const key = this.packKey(col, row);
        const cell = this.cells.get(key);
        if (!cell || cell.stamp !== this.stamp) continue;

        const items = cell.items;
        for (let i = 0; i < items.length; i++) {
          const e = items[i];
          const b = e.body;
          if (!b) continue;

          const dx = b.x - x;
          const dy = b.y - y;
          if (dx * dx + dy * dy <= r2) {
            result.push(e);
          }
        }
      }
    }

    return result;
  }

  private packKey(col: number, row: number): number {
    // Pack two small-ish signed ints into one 32-bit number
    // Shift columns by 16 and XOR rows; add offset to handle negatives reliably
    const c = (col + SpatialGrid.OFFSET) & 0xffff;
    const r = (row + SpatialGrid.OFFSET) & 0xffff;
    return (c << 16) ^ r;
  }
}
