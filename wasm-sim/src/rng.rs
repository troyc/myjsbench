pub(crate) struct Lcg {
    state: u64,
}

impl Lcg {
    pub(crate) fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1);
        (self.state >> 32) as u32
    }

    pub(crate) fn next_f32(&mut self) -> f32 {
        const SCALE: f32 = 1.0 / (u32::MAX as f32 + 1.0);
        self.next_u32() as f32 * SCALE
    }
}
