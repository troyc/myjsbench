import { GameSimulation, type SimulationBackend, type SimulationCommand } from '../GameSimulation/GameSimulation.js';
import { GameSimulationWasm } from '../GameSimulation/GameSimulationWasm.js';
import { Renderer } from './renderer.js';
import { createAppState } from './app-state.js';
import { setupControls } from './controls.js';
import { SimulationRunner } from './simulation-runner.js';

const INITIAL_COMMAND: SimulationCommand = {
  type: 'spawn_random_entities',
  count: 4,
  radius: 8,
  speed: 64,
};

function seedSimulation(simulation: SimulationBackend): void {
  simulation.next_tick([INITIAL_COMMAND], 0);
}

async function initialize(): Promise<void> {
  const jsSimulation = new GameSimulation();
  const renderer = new Renderer();
  const appState = createAppState();
  const runner = new SimulationRunner(jsSimulation, renderer, appState);

  seedSimulation(jsSimulation);

  let wasmSimulation: GameSimulationWasm | null = null;

  const toggleSimulationMode = async (): Promise<'js' | 'wasm'> => {
    if (appState.simulationMode === 'js') {
      if (!wasmSimulation) {
        wasmSimulation = await GameSimulationWasm.create();
        seedSimulation(wasmSimulation);
      }
      runner.setSimulation(wasmSimulation);
      appState.simulationMode = 'wasm';
    } else {
      runner.setSimulation(jsSimulation);
      appState.simulationMode = 'js';
    }

    return appState.simulationMode;
  };

  setupControls(runner, appState, { toggleSimulationMode });
  requestAnimationFrame(runner.run);

  console.log('MyJSBench initialized');
}

void initialize().catch((error) => {
  console.error('Failed to initialize MyJSBench', error);
});
