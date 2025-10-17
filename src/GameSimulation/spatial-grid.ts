import { Entity } from './components.js';

interface Cell {
  items: Entity[];
  stamp: number;
}

export class SpatialGrid {
  private cells: Map<number, Cell>;
  private cellSizeInv: number;
  private cellSize: number;
  private width: number;
  private height: number;
  private stamp: number;

  private static readonly OFFSET = 1 << 15;

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cellSizeInv = 1 / cellSize;
    this.cells = new Map<number, Cell>();
    this.stamp = 1;
  }

  setCellSize(cellSize: number): void {
    if (cellSize <= 0) {
      throw new Error('SpatialGrid cell size must be greater than zero.');
    }

    this.cellSize = cellSize;
    this.cellSizeInv = 1 / cellSize;
    this.cells.clear();
    this.stamp = 1;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getTotalCellCount(): number {
    const cols = Math.ceil(this.width / this.cellSize);
    const rows = Math.ceil(this.height / this.cellSize);
    return cols * rows;
  }

  clear(): void {
    this.stamp++;
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
    const c = (col + SpatialGrid.OFFSET) & 0xffff;
    const r = (row + SpatialGrid.OFFSET) & 0xffff;
    return (c << 16) ^ r;
  }
}
