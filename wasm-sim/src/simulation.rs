use std::{cell::RefCell, f32::consts::PI};

use crate::{
    rng::Lcg,
    types::{BodyRaw, EntityRaw},
    world::{Body, Entity, World},
};

const WORLD_WIDTH: f32 = 2500.0;
const WORLD_HEIGHT: f32 = 1200.0;
const INITIAL_CELL_SIZE: f32 = 24.0;
const MIN_CELL_SIZE: f32 = 8.0;

pub(crate) struct Simulation {
    world: World,
    rng: Lcg,
    next_entity_id: u32,
    state_cache: Vec<EntityRaw>,
    preview_cache: Vec<EntityRaw>,
}

impl Simulation {
    pub(crate) fn new() -> Self {
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

    pub(crate) fn spawn_random_entities(&mut self, count: u32, radius: f32, speed: f32) {
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

    pub(crate) fn remove_half_entities(&mut self) {
        self.world.remove_entities();
        self.refresh_state_cache();
    }

    pub(crate) fn adjust_grid_cell_size(&mut self, delta: f32) -> f32 {
        let next = self.world.get_grid_cell_size() + delta;
        self.set_grid_cell_size(next)
    }

    pub(crate) fn set_grid_cell_size(&mut self, size: f32) -> f32 {
        let max_cell = WORLD_WIDTH.max(WORLD_HEIGHT);
        let clamped = size.clamp(MIN_CELL_SIZE, max_cell);
        self.world.set_grid_cell_size(clamped);
        clamped
    }

    pub(crate) fn scale_radius(&mut self, factor: f32) {
        if factor <= 0.0 || !factor.is_finite() {
            return;
        }
        self.world.scale_radii(factor);
        self.refresh_state_cache();
    }

    pub(crate) fn update(&mut self, delta_time: f32) {
        if delta_time > 0.0 {
            self.world.update(delta_time);
            self.refresh_state_cache();
        }
    }

    pub(crate) fn get_state_ptr(&self) -> *const EntityRaw {
        self.state_cache.as_ptr()
    }

    pub(crate) fn get_state_len(&self) -> usize {
        self.state_cache.len()
    }

    pub(crate) fn build_preview(&mut self, delta_time: f32) {
        self.preview_cache.clear();

        let mut preview_world = self.world.clone();
        if delta_time > 0.0 {
            preview_world.update(delta_time);
        }

        Self::write_entities(&preview_world.entities, &mut self.preview_cache);
    }

    pub(crate) fn get_preview_ptr(&self) -> *const EntityRaw {
        self.preview_cache.as_ptr()
    }

    pub(crate) fn get_preview_len(&self) -> usize {
        self.preview_cache.len()
    }

    pub(crate) fn width(&self) -> f32 {
        self.world.width
    }

    pub(crate) fn height(&self) -> f32 {
        self.world.height
    }

    pub(crate) fn grid_cell_size(&self) -> f32 {
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

thread_local! {
    static SIMULATION: RefCell<Option<Simulation>> = RefCell::new(None);
}

pub(crate) fn with_simulation<F, R>(f: F) -> R
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

pub(crate) fn reset_simulation() {
    SIMULATION.with(|cell| {
        *cell.borrow_mut() = Some(Simulation::new());
    });
}
