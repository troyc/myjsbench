import type { SimulationCommand, GameSimulationState, SimulationBackend } from '../GameSimulation/GameSimulation.js';
import { AppState, TickSample } from './app-state.js';
import { Renderer } from './renderer.js';

export class SimulationRunner {
  private simulation: SimulationBackend;
  private renderer: Renderer;
  private appState: AppState;
  private commandQueue: SimulationCommand[] = [];

  constructor(simulation: SimulationBackend, renderer: Renderer, appState: AppState) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.appState = appState;
  }

  enqueueCommands(commands: SimulationCommand[]): void {
    if (commands.length === 0) return;
    this.commandQueue.push(...commands);
  }

  getSimulationState(): GameSimulationState {
    return this.simulation.get_state();
  }

  setSimulation(simulation: SimulationBackend): void {
    this.simulation = simulation;
    this.commandQueue = [];
    this.appState.accumulator = 0;
    this.appState.lastTime = performance.now();
    this.appState.tickSamples.length = 0;
    this.appState.tickDurationSum = 0;
    this.appState.tickTime = 0;
    this.appState.tickTimeAvg = 0;
  }

  run = (currentTime: number): void => {
    const deltaTime = (currentTime - this.appState.lastTime) / 1000;
    this.appState.lastTime = currentTime;
    this.appState.accumulator += deltaTime;

    const tickInterval = 1 / this.appState.tickRate;
    const pendingCommands = this.drainCommandQueue();
    let commandsApplied = false;

    while (this.appState.accumulator >= tickInterval) {
      const tickStart = performance.now();
      const commandsForTick = commandsApplied ? [] : pendingCommands;

      this.simulation.next_tick(commandsForTick, tickInterval);
      commandsApplied = true;

      const tickDuration = performance.now() - tickStart;
      this.appState.tickTime = tickDuration;
      this.trackTickDuration(tickDuration);

      this.appState.accumulator -= tickInterval;
    }

    if (!commandsApplied && pendingCommands.length > 0) {
      this.simulation.next_tick(pendingCommands, 0);
      commandsApplied = true;
    }

    if (deltaTime > 0) {
      const currentFps = 1 / deltaTime;
      this.appState.fps = this.appState.fps * 0.9 + currentFps * 0.1;
    }

    const baseState = this.simulation.get_state();

    if (this.appState.renderEnabled) {
      if (this.appState.smoothEnabled && this.appState.accumulator > 0) {
        const partialState = this.simulation.preview_state(this.appState.accumulator);
        this.renderer.render(partialState);
      } else {
        this.renderer.render(baseState);
      }
    }

    this.renderer.updateMetrics(
      this.appState.fps,
      this.appState.tickTime,
      this.appState.tickTimeAvg,
      baseState.entities.length
    );

    requestAnimationFrame(this.run);
  };

  private trackTickDuration(duration: number): void {
    const samples = this.appState.tickSamples;
    const now = performance.now();
    samples.push({ time: now, duration });

    let sum = this.appState.tickDurationSum + duration;
    const cutoff = now - 1000;
    while (samples.length > 0) {
      const oldest = samples[0];
      if (oldest.time >= cutoff) break;
      const removed = samples.shift() as TickSample;
      sum -= removed.duration;
    }

    this.appState.tickDurationSum = sum;
    this.appState.tickTimeAvg = samples.length > 0 ? sum / samples.length : 0;
  }

  private drainCommandQueue(): SimulationCommand[] {
    if (this.commandQueue.length === 0) {
      return [];
    }

    const commands = this.commandQueue;
    this.commandQueue = [];
    return commands;
  }
}
