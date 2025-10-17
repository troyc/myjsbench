use ahash::AHashSet;

use crate::{rng::Lcg, spatial_grid::SpatialGrid};

#[derive(Copy, Clone)]
pub(crate) struct Body {
    pub(crate) x: f32,
    pub(crate) y: f32,
    pub(crate) vx: f32,
    pub(crate) vy: f32,
    pub(crate) radius: f32,
}

#[derive(Copy, Clone)]
pub(crate) struct Entity {
    pub(crate) id: u32,
    pub(crate) body: Option<Body>,
}

pub(crate) struct World {
    pub(crate) entities: Vec<Entity>,
    pub(crate) width: f32,
    pub(crate) height: f32,
    spatial_grid: SpatialGrid,
}

impl World {
    pub(crate) fn new(width: f32, height: f32, cell_size: f32) -> Self {
        Self {
            entities: Vec::new(),
            width,
            height,
            spatial_grid: SpatialGrid::new(width, height, cell_size),
        }
    }

    pub(crate) fn add_entity(&mut self, mut entity: Entity, rng: &mut Lcg) {
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

    pub(crate) fn remove_entities(&mut self) {
        let half = self.entities.len() / 2;
        self.entities.truncate(half);
    }

    pub(crate) fn scale_radii(&mut self, factor: f32) {
        for entity in &mut self.entities {
            if let Some(body) = &mut entity.body {
                body.radius *= factor;
            }
        }
    }

    pub(crate) fn update(&mut self, delta_time: f32) {
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

        let mut seen = AHashSet::new();

        for i in 0..self.entities.len() {
            let Some(body_a) = self.entities[i].body.as_mut() else {
                continue;
            };

            let nearby = self
                .spatial_grid
                .get_entities_in_radius(
                    body_a.x,
                    body_a.y,
                    body_a.radius,
                    Some(i),
                    &mut seen,
                );

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

                // Positional correction to resolve overlap
                let overlap = min_dist - distance;
                if overlap > 0.0 {
                    let separation_x = nx * overlap * 0.5;
                    let separation_y = ny * overlap * 0.5;
                    body_a.x -= separation_x;
                    body_a.y -= separation_y;
                    body_b.x += separation_x;
                    body_b.y += separation_y;
                }

                // Only apply velocity response if moving toward each other
                if vn > 0.0 {
                    let impulse = vn; // equal mass, elastic along normal
                    body_a.vx -= impulse * nx;
                    body_a.vy -= impulse * ny;
                    body_b.vx += impulse * nx;
                    body_b.vy += impulse * ny;
                }
            }
        }
    }

    pub(crate) fn set_grid_cell_size(&mut self, cell_size: f32) {
        self.spatial_grid.set_cell_size(cell_size);
    }

    pub(crate) fn get_grid_cell_size(&self) -> f32 {
        self.spatial_grid.cell_size()
    }
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
