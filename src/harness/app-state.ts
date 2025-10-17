export interface TickSample {
  time: number;
  duration: number;
}

export interface AppState {
  renderEnabled: boolean;
  tickRate: 30 | 120;
  smoothEnabled: boolean;
  lastTime: number;
  accumulator: number;
  fps: number;
  tickTime: number;
  tickTimeAvg: number;
  tickSamples: TickSample[];
  tickDurationSum: number;
  simulationMode: 'js' | 'wasm';
}

export function createAppState(): AppState {
  return {
    renderEnabled: true,
    tickRate: 30,
    smoothEnabled: false,
    lastTime: performance.now(),
    accumulator: 0,
    fps: 60,
    tickTime: 0,
    tickTimeAvg: 0,
    tickSamples: [],
    tickDurationSum: 0,
    simulationMode: 'js',
  };
}
