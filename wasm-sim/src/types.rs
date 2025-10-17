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
