import { Entity } from './components.js';

interface Cell {
  items: Entity[];
  stamp: number;
}

export class SpatialGrid {
  private cells: Cell[]; // flat row-major grid
  private cols: number;
  private rows: number;
  private cellSizeInv: number;
  private cellSize: number;
  private width: number;
  private height: number;
  private stamp: number;

  // Per-query dedupe without Set
  private seenMarks: number[] = [];
  private seenStamp = 1;

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cellSizeInv = 1 / cellSize;
    const [cols, rows] = this.dims(width, height, cellSize);
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array<Cell>(cols * rows);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = { items: [], stamp: 0 };
    }
    this.stamp = 1;
  }

  setCellSize(cellSize: number): void {
    if (cellSize <= 0) {
      throw new Error('SpatialGrid cell size must be greater than zero.');
    }

    this.cellSize = cellSize;
    this.cellSizeInv = 1 / cellSize;
    const [cols, rows] = this.dims(this.width, this.height, cellSize);
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.cells = new Array<Cell>(cols * rows);
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i] = { items: [], stamp: 0 };
      }
    } else {
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i].items.length = 0;
        this.cells[i].stamp = 0;
      }
      this.stamp = 1;
    }
    this.seenMarks.length = 0;
    this.seenStamp = 1;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getTotalCellCount(): number {
    return this.cols * this.rows;
  }

  clear(): void {
    this.stamp++;
    if (this.stamp >= Number.MAX_SAFE_INTEGER) {
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i].items.length = 0;
        this.cells[i].stamp = 0;
      }
      this.stamp = 1;
    }
  }

  private dims(width: number, height: number, cellSize: number): [number, number] {
    const cols = Math.max(1, Math.ceil(width / cellSize));
    const rows = Math.max(1, Math.ceil(height / cellSize));
    return [cols, rows];
  }

  private idx(col: number, row: number): number {
    return row * this.cols + col;
  }

  private clampIndex(v: number, max: number): number {
    if (v < 0) return 0;
    if (v >= max) return max - 1;
    return v;
  }

  insert(entity: Entity): void {
    const body = entity.body;
    if (!body) return;

    let minCol = Math.floor((body.x - body.radius) * this.cellSizeInv);
    let maxCol = Math.floor((body.x + body.radius) * this.cellSizeInv);
    let minRow = Math.floor((body.y - body.radius) * this.cellSizeInv);
    let maxRow = Math.floor((body.y + body.radius) * this.cellSizeInv);

    minCol = this.clampIndex(minCol, this.cols);
    maxCol = this.clampIndex(maxCol, this.cols);
    minRow = this.clampIndex(minRow, this.rows);
    maxRow = this.clampIndex(maxRow, this.rows);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells[this.idx(col, row)];
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
    return this.getEntitiesInRadius(body.x, body.y, body.radius, entity.id);
  }

  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    ignoreEntityId?: number
  ): Entity[] {
    const result: Entity[] = [];

    // Advance per-query stamp (dedupe) and reset on wrap
    this.seenStamp++;
    if (this.seenStamp >= Number.MAX_SAFE_INTEGER) {
      this.seenMarks.fill(0);
      this.seenStamp = 1;
    }

    const ignoreMark =
      ignoreEntityId === undefined ? undefined : ignoreEntityId >>> 0;

    let minCol = Math.floor((x - radius) * this.cellSizeInv);
    let maxCol = Math.floor((x + radius) * this.cellSizeInv);
    let minRow = Math.floor((y - radius) * this.cellSizeInv);
    let maxRow = Math.floor((y + radius) * this.cellSizeInv);

    minCol = this.clampIndex(minCol, this.cols);
    maxCol = this.clampIndex(maxCol, this.cols);
    minRow = this.clampIndex(minRow, this.rows);
    maxRow = this.clampIndex(maxRow, this.rows);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells[this.idx(col, row)];
        if (cell.stamp !== this.stamp) continue;

        const items = cell.items;
        for (let i = 0; i < items.length; i++) {
          const e = items[i];
          const b = e.body;
          if (!b) continue;

          const id = e.id >>> 0;
          if (ignoreMark !== undefined && id === ignoreMark) {
            continue;
          }

          // Dedupe per query; leave precise distance check to narrow-phase
          if (id >= this.seenMarks.length) {
            this.seenMarks.length = id + 1;
          }
          if (this.seenMarks[id] !== this.seenStamp) {
            this.seenMarks[id] = this.seenStamp;
            result.push(e);
          }
        }
      }
    }

    return result;
  }
}
