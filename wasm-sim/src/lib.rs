use std::cell::RefCell;
use std::collections::{HashMap, HashSet};
use std::f32::consts::PI;

const WORLD_WIDTH: f32 = 2500.0;
const WORLD_HEIGHT: f32 = 1200.0;
const INITIAL_CELL_SIZE: f32 = 24.0;
const MIN_CELL_SIZE: f32 = 8.0;

thread_local! {
    static SIMULATION: RefCell<Option<Simulation>> = RefCell::new(None);
}

#[repr(C)]
#[derive(Copy, Clone, Default)]
pub struct BodyRaw {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub radius: f32,
}

#[repr(C)]
#[derive(Copy, Clone, Default)]
pub struct EntityRaw {
    pub id: u32,
    pub has_body: u32,
    pub body: BodyRaw,
}

#[derive(Clone)]
struct Body {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    radius: f32,
}

#[derive(Clone)]
struct Entity {
    id: u32,
    body: Option<Body>,
}

struct Simulation {
    world: World,
    rng: Lcg,
    next_entity_id: u32,
    state_cache: Vec<EntityRaw>,
    preview_cache: Vec<EntityRaw>,
}

impl Simulation {
    fn new() -> Self {
        let mut sim = Self {
            world: World::new(WORLD_WIDTH, WORLD_HEIGHT, INITIAL_CELL_SIZE),
            rng: Lcg::new(0x1234_5678_9abc_def0),
            next_entity_id: 1,
            state_cache: Vec::new(),
            preview_cache: Vec::new(),
        };
        sim.refresh_state_cache();
        sim
    }

    fn spawn_random_entities(&mut self, count: u32, radius: f32, speed: f32) {
        if count == 0 {
            return;
        }
        let count = count.min(10_000);

        let tau = 2.0 * PI;

        for _ in 0..count {
            let angle = self.rng.next_f32() * tau;
            let vx = speed * angle.cos();
            let vy = speed * angle.sin();
            let entity = Entity {
                id: self.next_entity_id(),
                body: Some(Body {
                    x: 0.0,
                    y: 0.0,
                    vx,
                    vy,
                    radius,
                }),
            };
            self.world.add_entity(entity, &mut self.rng);
        }

        self.refresh_state_cache();
    }

    fn remove_half_entities(&mut self) {
        self.world.remove_entities();
        self.refresh_state_cache();
    }

    fn adjust_grid_cell_size(&mut self, delta: f32) -> f32 {
        let next = self.world.get_grid_cell_size() + delta;
        self.set_grid_cell_size(next)
    }

    fn set_grid_cell_size(&mut self, size: f32) -> f32 {
        let max_cell = WORLD_WIDTH.max(WORLD_HEIGHT);
        let clamped = size.clamp(MIN_CELL_SIZE, max_cell);
        self.world.set_grid_cell_size(clamped);
        clamped
    }

    fn scale_radius(&mut self, factor: f32) {
        if factor <= 0.0 || !factor.is_finite() {
            return;
        }
        self.world.scale_radii(factor);
        self.refresh_state_cache();
    }

    fn update(&mut self, delta_time: f32) {
        if delta_time > 0.0 {
            self.world.update(delta_time);
            self.refresh_state_cache();
        }
    }

    fn get_state_ptr(&self) -> *const EntityRaw {
        self.state_cache.as_ptr()
    }

    fn get_state_len(&self) -> usize {
        self.state_cache.len()
    }

    fn build_preview(&mut self, delta_time: f32) {
        self.preview_cache.clear();

        let mut preview_world = self.world.clone();
        if delta_time > 0.0 {
            preview_world.update(delta_time);
        }

        Self::write_entities(&preview_world.entities, &mut self.preview_cache);
    }

    fn get_preview_ptr(&self) -> *const EntityRaw {
        self.preview_cache.as_ptr()
    }

    fn get_preview_len(&self) -> usize {
        self.preview_cache.len()
    }

    fn width(&self) -> f32 {
        self.world.width
    }

    fn height(&self) -> f32 {
        self.world.height
    }

    fn grid_cell_size(&self) -> f32 {
        self.world.get_grid_cell_size()
    }

    fn refresh_state_cache(&mut self) {
        self.preview_cache.clear();
        Self::write_entities(&self.world.entities, &mut self.state_cache);
    }

    fn write_entities(entities: &[Entity], target: &mut Vec<EntityRaw>) {
        target.clear();
        target.reserve(entities.len());
        for entity in entities {
            if let Some(body) = &entity.body {
                target.push(EntityRaw {
                    id: entity.id,
                    has_body: 1,
                    body: BodyRaw {
                        x: body.x,
                        y: body.y,
                        vx: body.vx,
                        vy: body.vy,
                        radius: body.radius,
                    },
                });
            } else {
                target.push(EntityRaw {
                    id: entity.id,
                    has_body: 0,
                    body: BodyRaw::default(),
                });
            }
        }
    }

    fn next_entity_id(&mut self) -> u32 {
        let id = self.next_entity_id;
        self.next_entity_id = self.next_entity_id.saturating_add(1);
        id
    }
}

struct World {
    entities: Vec<Entity>,
    width: f32,
    height: f32,
    spatial_grid: SpatialGrid,
}

impl Clone for World {
    fn clone(&self) -> Self {
        Self {
            entities: self.entities.clone(),
            width: self.width,
            height: self.height,
            spatial_grid: SpatialGrid::new(self.width, self.height, self.spatial_grid.cell_size()),
        }
    }
}

impl World {
    fn new(width: f32, height: f32, cell_size: f32) -> Self {
        Self {
            entities: Vec::new(),
            width,
            height,
            spatial_grid: SpatialGrid::new(width, height, cell_size),
        }
    }

    fn add_entity(&mut self, mut entity: Entity, rng: &mut Lcg) {
        if entity.body.is_none() {
            self.entities.push(entity);
            return;
        }

        let mut placed = false;
        {
            let body = entity.body.as_mut().unwrap();
            let radius = body.radius;

            for _attempt in 0..100 {
                let x = rng.next_f32() * self.width;
                let y = rng.next_f32() * self.height;

                let mut collides = false;
                for other in &self.entities {
                    if let Some(other_body) = &other.body {
                        let dx = x - other_body.x;
                        let dy = y - other_body.y;
                        let min_dist = radius + other_body.radius;
                        if dx * dx + dy * dy < min_dist * min_dist {
                            collides = true;
                            break;
                        }
                    }
                }

                if !collides {
                    body.x = x;
                    body.y = y;
                    placed = true;
                    break;
                }
            }

            if !placed {
                body.x = rng.next_f32() * self.width;
                body.y = rng.next_f32() * self.height;
            }
        }

        self.entities.push(entity);
    }

    fn remove_entities(&mut self) {
        let half = self.entities.len() / 2;
        self.entities.truncate(half);
    }

    fn scale_radii(&mut self, factor: f32) {
        for entity in &mut self.entities {
            if let Some(body) = &mut entity.body {
                body.radius *= factor;
            }
        }
    }

    fn update(&mut self, delta_time: f32) {
        self.spatial_grid.clear();

        for (i, entity) in self.entities.iter_mut().enumerate() {
            let Some(body) = entity.body.as_mut() else {
                continue;
            };

            body.x += body.vx * delta_time;
            body.y += body.vy * delta_time;

            let radius = body.radius;

            if body.x - radius < 0.0 {
                body.x = radius;
                body.vx = body.vx.abs();
            } else if body.x + radius > self.width {
                body.x = self.width - radius;
                body.vx = -body.vx.abs();
            }

            if body.y - radius < 0.0 {
                body.y = radius;
                body.vy = body.vy.abs();
            } else if body.y + radius > self.height {
                body.y = self.height - radius;
                body.vy = -body.vy.abs();
            }

            self.spatial_grid.insert(i, body.x, body.y, radius);
        }

        let mut nearby = Vec::new();
        let mut seen = HashSet::new();

        for i in 0..self.entities.len() {
            let Some(body_a) = self.entities[i].body.as_mut() else {
                continue;
            };

            nearby.clear();
            seen.clear();
            self.spatial_grid
                .query(body_a.x, body_a.y, body_a.radius, &mut nearby, &mut seen);

            for &j in &nearby {
                if j <= i {
                    continue;
                }

                let (left, right) = self.entities.split_at_mut(j);
                let entity_a = &mut left[i];
                let entity_b = &mut right[0];

                let (Some(body_a), Some(body_b)) = (entity_a.body.as_mut(), entity_b.body.as_mut())
                else {
                    continue;
                };

                let dx = body_b.x - body_a.x;
                let dy = body_b.y - body_a.y;
                let d2 = dx * dx + dy * dy;
                if d2 <= 0.0 {
                    continue;
                }

                let min_dist = body_a.radius + body_b.radius;
                let min_dist2 = min_dist * min_dist;
                if d2 >= min_dist2 {
                    continue;
                }

                let distance = d2.sqrt();
                let nx = dx / distance;
                let ny = dy / distance;

                let dvx = body_a.vx - body_b.vx;
                let dvy = body_a.vy - body_b.vy;
                let vn = dvx * nx + dvy * ny;

                if vn <= 0.0 {
                    continue;
                }

                let impulse = vn;
                body_a.vx -= impulse * nx;
                body_a.vy -= impulse * ny;
                body_b.vx += impulse * nx;
                body_b.vy += impulse * ny;

                let overlap = min_dist - distance;
                let separation_x = nx * overlap * 0.5;
                let separation_y = ny * overlap * 0.5;
                body_a.x -= separation_x;
                body_a.y -= separation_y;
                body_b.x += separation_x;
                body_b.y += separation_y;
            }
        }
    }

    fn set_grid_cell_size(&mut self, cell_size: f32) {
        self.spatial_grid.set_cell_size(cell_size);
    }

    fn get_grid_cell_size(&self) -> f32 {
        self.spatial_grid.cell_size()
    }
}

struct SpatialGrid {
    cells: HashMap<u32, Cell>,
    cell_size_inv: f32,
    cell_size: f32,
    stamp: u32,
}

struct Cell {
    items: Vec<usize>,
    stamp: u32,
}

impl SpatialGrid {
    const OFFSET: i32 = 1 << 15;

    fn new(_width: f32, _height: f32, cell_size: f32) -> Self {
        assert!(cell_size > 0.0, "cell size must be positive");
        Self {
            cells: HashMap::new(),
            cell_size_inv: 1.0 / cell_size,
            cell_size,
            stamp: 1,
        }
    }

    fn set_cell_size(&mut self, cell_size: f32) {
        assert!(cell_size > 0.0);
        self.cell_size = cell_size;
        self.cell_size_inv = 1.0 / cell_size;
        self.cells.clear();
        self.stamp = 1;
    }

    fn cell_size(&self) -> f32 {
        self.cell_size
    }

    fn clear(&mut self) {
        self.stamp = self.stamp.wrapping_add(1);
        if self.stamp == 0 {
            self.cells.clear();
            self.stamp = 1;
        }
    }

    fn insert(&mut self, index: usize, x: f32, y: f32, radius: f32) {
        let min_col = ((x - radius) * self.cell_size_inv).floor() as i32;
        let max_col = ((x + radius) * self.cell_size_inv).floor() as i32;
        let min_row = ((y - radius) * self.cell_size_inv).floor() as i32;
        let max_row = ((y + radius) * self.cell_size_inv).floor() as i32;

        for col in min_col..=max_col {
            for row in min_row..=max_row {
                let key = Self::pack_key(col, row);
                let cell = self.cells.entry(key).or_insert_with(|| Cell {
                    items: Vec::new(),
                    stamp: 0,
                });

                if cell.stamp != self.stamp {
                    cell.items.clear();
                    cell.stamp = self.stamp;
                }

                cell.items.push(index);
            }
        }
    }

    fn query(&self, x: f32, y: f32, radius: f32, out: &mut Vec<usize>, seen: &mut HashSet<usize>) {
        out.clear();
        seen.clear();

        let min_col = (((x - radius) * self.cell_size_inv).floor() as i32) - 1;
        let max_col = (((x + radius) * self.cell_size_inv).floor() as i32) + 1;
        let min_row = (((y - radius) * self.cell_size_inv).floor() as i32) - 1;
        let max_row = (((y + radius) * self.cell_size_inv).floor() as i32) + 1;

        for col in min_col..=max_col {
            for row in min_row..=max_row {
                let key = Self::pack_key(col, row);
                if let Some(cell) = self.cells.get(&key) {
                    if cell.stamp != self.stamp {
                        continue;
                    }

                    for &idx in &cell.items {
                        if seen.insert(idx) {
                            out.push(idx);
                        }
                    }
                }
            }
        }
    }

    fn pack_key(col: i32, row: i32) -> u32 {
        let c = ((col + Self::OFFSET) & 0xffff) as u32;
        let r = ((row + Self::OFFSET) & 0xffff) as u32;
        (c << 16) ^ r
    }
}

struct Lcg {
    state: u64,
}

impl Lcg {
    fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1);
        (self.state >> 32) as u32
    }

    fn next_f32(&mut self) -> f32 {
        const SCALE: f32 = 1.0 / (u32::MAX as f32 + 1.0);
        self.next_u32() as f32 * SCALE
    }
}

fn with_simulation<F, R>(f: F) -> R
where
    F: FnOnce(&mut Simulation) -> R,
{
    SIMULATION.with(|cell| {
        let mut borrow = cell.borrow_mut();
        if borrow.is_none() {
            *borrow = Some(Simulation::new());
        }
        f(borrow.as_mut().unwrap())
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_init() {
    SIMULATION.with(|cell| {
        *cell.borrow_mut() = Some(Simulation::new());
    });
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_spawn_random_entities(count: u32, radius: f32, speed: f32) {
    with_simulation(|sim| sim.spawn_random_entities(count, radius, speed));
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_remove_half_entities() {
    with_simulation(|sim| sim.remove_half_entities());
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_adjust_grid_cell_size(delta: f32) -> f32 {
    with_simulation(|sim| sim.adjust_grid_cell_size(delta))
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_set_grid_cell_size(size: f32) -> f32 {
    with_simulation(|sim| sim.set_grid_cell_size(size))
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_scale_radius(factor: f32) {
    with_simulation(|sim| sim.scale_radius(factor));
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_update(delta_time: f32) {
    with_simulation(|sim| sim.update(delta_time));
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_state_ptr() -> *const EntityRaw {
    with_simulation(|sim| sim.get_state_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_state_len() -> usize {
    with_simulation(|sim| sim.get_state_len())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_preview(delta_time: f32) {
    with_simulation(|sim| sim.build_preview(delta_time));
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_preview_ptr() -> *const EntityRaw {
    with_simulation(|sim| sim.get_preview_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_preview_len() -> usize {
    with_simulation(|sim| sim.get_preview_len())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_width() -> f32 {
    with_simulation(|sim| sim.width())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_height() -> f32 {
    with_simulation(|sim| sim.height())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_grid_cell_size() -> f32 {
    with_simulation(|sim| sim.grid_cell_size())
}

#[unsafe(no_mangle)]
pub extern "C" fn sim_get_entity_stride() -> usize {
    core::mem::size_of::<EntityRaw>()
}
