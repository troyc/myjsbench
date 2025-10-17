use ahash::AHashSet;
use smallvec::SmallVec;

pub(crate) struct SpatialGrid {
    // Preallocated 2D grid stored row-major in a flat Vec
    cells: Vec<Cell>,
    cols: i32,
    rows: i32,
    width: f32,
    height: f32,
    cell_size_inv: f32,
    cell_size: f32,
    // Frame stamp used to lazily clear cells
    stamp: u32,
    // Per-query deduplication without HashSet
    seen_marks: Vec<u32>,
    seen_stamp: u32,
}

const CELL_INLINE_CAP: usize = 2;
const QUERY_INLINE_CAP: usize = 2;

struct Cell {
    items: SmallVec<[usize; CELL_INLINE_CAP]>,
    stamp: u32,
}

impl SpatialGrid {
    pub(crate) fn new(width: f32, height: f32, cell_size: f32) -> Self {
        assert!(cell_size > 0.0, "cell size must be positive");
        let (cols, rows) = Self::dims(width, height, cell_size);
        let mut cells = Vec::with_capacity((cols as usize) * (rows as usize));
        for _ in 0..(cols as usize) * (rows as usize) {
            cells.push(Cell {
                items: SmallVec::new(),
                stamp: 0,
            });
        }

        Self {
            cells,
            cols,
            rows,
            width,
            height,
            cell_size_inv: 1.0 / cell_size,
            cell_size,
            stamp: 1,
            seen_marks: Vec::new(),
            seen_stamp: 1,
        }
    }

    pub(crate) fn set_cell_size(&mut self, cell_size: f32) {
        assert!(cell_size > 0.0);
        self.cell_size = cell_size;
        self.cell_size_inv = 1.0 / cell_size;

        // Recompute grid dimensions and reinitialize cells
        let (cols, rows) = Self::dims(self.width, self.height, cell_size);
        if cols != self.cols || rows != self.rows {
            self.cols = cols;
            self.rows = rows;
            self.cells.clear();
            self.cells.reserve((cols as usize) * (rows as usize));
            for _ in 0..(cols as usize) * (rows as usize) {
                self.cells.push(Cell {
                    items: SmallVec::new(),
                    stamp: 0,
                });
            }
        } else {
            // Same grid shape; just reset stamps lazily
            self.stamp = 1;
            for cell in &mut self.cells {
                cell.stamp = 0;
                cell.items.clear();
            }
        }
        // Reset seen data as well
        self.seen_marks.clear();
        self.seen_stamp = 1;
    }

    pub(crate) fn cell_size(&self) -> f32 {
        self.cell_size
    }

    pub(crate) fn clear(&mut self) {
        self.stamp = self.stamp.wrapping_add(1);
        if self.stamp == 0 {
            // Extremely rare wrap-around: fully reset stamps
            self.stamp = 1;
            for cell in &mut self.cells {
                cell.stamp = 0;
                cell.items.clear();
            }
        }
    }

    #[inline]
    fn dims(width: f32, height: f32, cell_size: f32) -> (i32, i32) {
        let cols = (width / cell_size).ceil() as i32;
        let rows = (height / cell_size).ceil() as i32;
        (cols.max(1), rows.max(1))
    }

    #[inline]
    fn clamp_index(v: i32, max: i32) -> i32 {
        if v < 0 { 0 } else if v >= max { max - 1 } else { v }
    }

    #[inline]
    fn to_col(&self, x: f32) -> i32 {
        (x * self.cell_size_inv).floor() as i32
    }

    #[inline]
    fn to_row(&self, y: f32) -> i32 {
        (y * self.cell_size_inv).floor() as i32
    }

    pub(crate) fn insert(&mut self, index: usize, x: f32, y: f32, radius: f32) {
        let mut min_col = self.to_col(x - radius);
        let mut max_col = self.to_col(x + radius);
        let mut min_row = self.to_row(y - radius);
        let mut max_row = self.to_row(y + radius);

        // Clamp to grid bounds
        min_col = Self::clamp_index(min_col, self.cols);
        max_col = Self::clamp_index(max_col, self.cols);
        min_row = Self::clamp_index(min_row, self.rows);
        max_row = Self::clamp_index(max_row, self.rows);

        let cols = self.cols as usize;
        for row in min_row..=max_row {
            let base = (row as usize) * cols;
            for col in min_col..=max_col {
                let idx = base + (col as usize);
                let cell = &mut self.cells[idx];
                if cell.stamp != self.stamp {
                    cell.items.clear();
                    cell.stamp = self.stamp;
                }
                cell.items.push(index);
            }
        }
    }

    pub(crate) fn query(
        &mut self,
        x: f32,
        y: f32,
        radius: f32,
        seen_external: &mut AHashSet<usize>,
    ) -> SmallVec<[usize; QUERY_INLINE_CAP]> {
        seen_external.clear();

        // Advance the per-query stamp and reset marks on wrap
        self.seen_stamp = self.seen_stamp.wrapping_add(1);
        if self.seen_stamp == 0 {
            self.seen_marks.fill(0);
            self.seen_stamp = 1;
        }

        let mut results = SmallVec::<[usize; QUERY_INLINE_CAP]>::new();

        let mut min_col = self.to_col(x - radius);
        let mut max_col = self.to_col(x + radius);
        let mut min_row = self.to_row(y - radius);
        let mut max_row = self.to_row(y + radius);

        // Clamp to grid bounds
        min_col = Self::clamp_index(min_col, self.cols);
        max_col = Self::clamp_index(max_col, self.cols);
        min_row = Self::clamp_index(min_row, self.rows);
        max_row = Self::clamp_index(max_row, self.rows);

        let cols = self.cols as usize;
        for row in min_row..=max_row {
            let base = (row as usize) * cols;
            for col in min_col..=max_col {
                let idx = base + (col as usize);
                let cell = &self.cells[idx];
                if cell.stamp != self.stamp {
                    continue;
                }
                for &idx in &cell.items {
                    if idx < self.seen_marks.len() {
                        if self.seen_marks[idx] != self.seen_stamp {
                            self.seen_marks[idx] = self.seen_stamp;
                            results.push(idx);
                        }
                    } else {
                        // Avoid growing a giant marks array for sparse large indices; use hash set fallback
                        if seen_external.insert(idx) {
                            results.push(idx);
                        }
                    }
                }
            }
        }

        results
    }
}
