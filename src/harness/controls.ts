import { SimulationRunner } from './simulation-runner.js';
import { AppState } from './app-state.js';
import { SimulationCommand } from '../GameSimulation/GameSimulation.js';

export interface ControlCallbacks {
  toggleSimulationMode: () => Promise<'js' | 'wasm'>;
}

export function setupControls(
  runner: SimulationRunner,
  appState: AppState,
  callbacks: ControlCallbacks
): void {
  const gridInfo = document.getElementById('grid-info');

  const updateGridInfo = (): void => {
    if (!gridInfo) return;

    const state = runner.getSimulationState();
    const cellSize = state.gridCellSize;
    const cols = Math.ceil(state.width / cellSize);
    const rows = Math.ceil(state.height / cellSize);
    gridInfo.textContent = `Grid Cell: ${Math.round(cellSize)}px | Cells: ${cols * rows}`;
  };

  const queueCommands = (commands: SimulationCommand[]): void => {
    if (commands.length === 0) return;
    runner.enqueueCommands(commands);
    requestAnimationFrame(updateGridInfo);
  };

  const inferRadius = (): number => {
    const state = runner.getSimulationState();
    for (const entity of state.entities) {
      if (entity.body) {
        return entity.body.radius;
      }
    }
    return 8;
  };

  const minusBtn = document.getElementById('minus-btn');
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      queueCommands([{ type: 'remove_half_entities' }]);
    });
  }

  const plusBtn = document.getElementById('plus-btn');
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      const count = runner.getSimulationState().entities.length;
      if (count === 0) return;

      queueCommands([
        {
          type: 'spawn_random_entities',
          count,
          radius: inferRadius(),
          speed: 64,
        },
      ]);
    });
  }

  const gridMinusBtn = document.getElementById('grid-minus-btn');
  if (gridMinusBtn) {
    gridMinusBtn.addEventListener('click', () => {
      queueCommands([{ type: 'adjust_grid_cell_size', delta: -8 }]);
    });
  }

  const gridPlusBtn = document.getElementById('grid-plus-btn');
  if (gridPlusBtn) {
    gridPlusBtn.addEventListener('click', () => {
      queueCommands([{ type: 'adjust_grid_cell_size', delta: 8 }]);
    });
  }

  const renderBtn = document.getElementById('render-btn');
  if (renderBtn) {
    renderBtn.addEventListener('click', () => {
      appState.renderEnabled = !appState.renderEnabled;
      renderBtn.textContent = `Render: ${appState.renderEnabled ? 'ON' : 'OFF'}`;
    });
  }

  const tickBtn = document.getElementById('tick-btn');
  if (tickBtn) {
    tickBtn.addEventListener('click', () => {
      appState.tickRate = appState.tickRate === 30 ? 120 : 30;
      tickBtn.textContent = `Tick: ${appState.tickRate}`;
    });
  }

  const smoothBtn = document.getElementById('smooth-btn');
  if (smoothBtn) {
    smoothBtn.addEventListener('click', () => {
      appState.smoothEnabled = !appState.smoothEnabled;
      smoothBtn.textContent = `Smooth: ${appState.smoothEnabled ? 'ON' : 'OFF'}`;
    });
  }

  const radiusMinusBtn = document.getElementById('radius-minus-btn');
  if (radiusMinusBtn) {
    radiusMinusBtn.addEventListener('click', () => {
      const scaleFactor = 1 / Math.sqrt(2);
      queueCommands([{ type: 'scale_radius', factor: scaleFactor }]);
    });
  }

  const radiusPlusBtn = document.getElementById('radius-plus-btn');
  if (radiusPlusBtn) {
    radiusPlusBtn.addEventListener('click', () => {
      const scaleFactor = Math.sqrt(2);
      queueCommands([{ type: 'scale_radius', factor: scaleFactor }]);
    });
  }

  const modeBtn = document.getElementById('mode-btn') as HTMLButtonElement | null;
  const updateModeButton = (mode: 'js' | 'wasm'): void => {
    if (!modeBtn) return;
    const label = mode === 'js' ? 'JS' : 'WASM';
    modeBtn.textContent = `Mode: ${label}`;
  };

  if (modeBtn) {
    modeBtn.addEventListener('click', async () => {
      modeBtn.disabled = true;
      modeBtn.textContent = 'Mode: Loading...';
      try {
        const mode = await callbacks.toggleSimulationMode();
        appState.simulationMode = mode;
        updateModeButton(mode);
        requestAnimationFrame(updateGridInfo);
      } catch (error) {
        console.error('Failed to toggle simulation mode', error);
        updateModeButton(appState.simulationMode);
      } finally {
        modeBtn.disabled = false;
      }
    });

    updateModeButton(appState.simulationMode);
  }

  updateGridInfo();
}
