mod rng;
mod simulation;
mod spatial_grid;
mod types;
mod world;

pub use types::{BodyRaw, EntityRaw};

use simulation::{reset_simulation, with_simulation};

#[unsafe(no_mangle)]
pub extern "C" fn sim_init() {
    reset_simulation();
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
