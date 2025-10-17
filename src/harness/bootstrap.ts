import { GameSimulation } from '../GameSimulation/GameSimulation.js';
import { Renderer } from './renderer.js';
import { createAppState } from './app-state.js';
import { setupControls } from './controls.js';
import { SimulationRunner } from './simulation-runner.js';

const simulation = new GameSimulation();
const renderer = new Renderer();
const appState = createAppState();
const runner = new SimulationRunner(simulation, renderer, appState);

simulation.next_tick(
  [
    {
      type: 'spawn_random_entities',
      count: 4,
      radius: 8,
      speed: 64,
    },
  ],
  0
);

setupControls(runner, appState);

requestAnimationFrame(runner.run);

console.log('MyJSBench initialized');
