// AppState interface to track render, tick rate, smooth rendering, and timing state
export interface AppState {
  renderEnabled: boolean;
  tickRate: 30 | 120;
  smoothEnabled: boolean;
  lastTime: number;
  accumulator: number;
  fps: number;
  tickTime: number;
}

// Initialize application state
export function createAppState(): AppState {
  return {
    renderEnabled: true,
    tickRate: 30,
    smoothEnabled: false,
    lastTime: performance.now(),
    accumulator: 0,
    fps: 60,
    tickTime: 0,
  };
}