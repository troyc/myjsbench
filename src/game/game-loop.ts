import { World } from '../physics/world.js';
import { Renderer } from '../rendering/renderer.js';
import { AppState } from '../ui/app-state.js';
import type { TickSample } from '../ui/app-state.js';

export class GameLoop {
  private world: World;
  private renderer: Renderer;
  private appState: AppState;

  constructor(world: World, renderer: Renderer, appState: AppState) {
    this.world = world;
    this.renderer = renderer;
    this.appState = appState;
  }

  // Main game loop with fixed timestep
  run = (currentTime: number): void => {
    // Calculate elapsed time since last frame (in seconds)
    const deltaTime = (currentTime - this.appState.lastTime) / 1000;
    this.appState.lastTime = currentTime;

    // Add elapsed time to accumulator
    this.appState.accumulator += deltaTime;

    // Calculate fixed timestep interval based on tick rate
    const tickInterval = 1 / this.appState.tickRate;

    // Process fixed timestep updates
    while (this.appState.accumulator >= tickInterval) {
      // Track tick start time
      const tickStart = performance.now();

      // Update world physics
      this.world.update(tickInterval);

      // Calculate tick time in milliseconds
      const tickEnd = performance.now();
      const tickDuration = tickEnd - tickStart;
      this.appState.tickTime = tickDuration;

      const samples = this.appState.tickSamples;
      samples.push({ time: tickEnd, duration: tickDuration });

      let sum = this.appState.tickDurationSum + tickDuration;
      const cutoff = tickEnd - 1000;
      while (samples.length > 0) {
        const oldest = samples[0];
        if (oldest.time >= cutoff) break;
        const removed = samples.shift() as TickSample;
        sum -= removed.duration;
      }

      this.appState.tickDurationSum = sum;
      this.appState.tickTimeAvg = samples.length > 0 ? sum / samples.length : 0;

      // Subtract tick interval from accumulator
      this.appState.accumulator -= tickInterval;
    }

    // Render the world if rendering is enabled
    if (this.appState.renderEnabled) {
      if (this.appState.smoothEnabled) {
        // Smooth rendering: clone world state and run partial tick
        const clonedWorld = this.world.clone();
        
        // Calculate remaining time fraction
        const partialDeltaTime = this.appState.accumulator;
        
        // Run partial tick on cloned world
        clonedWorld.update(partialDeltaTime);
        
        // Render the interpolated cloned world state
        this.renderer.render(clonedWorld);
        
        // Cloned world is discarded after rendering (goes out of scope)
      } else {
        // Normal rendering: render current world state
        this.renderer.render(this.world);
      }
    }

    // Update FPS using exponential moving average
    const currentFps = 1 / deltaTime;
    this.appState.fps = this.appState.fps * 0.9 + currentFps * 0.1;

    // Update performance metrics display
    this.renderer.updateMetrics(
      this.appState.fps,
      this.appState.tickTime,
      this.appState.tickTimeAvg,
      this.world.entities.length
    );

    // Continue the loop
    requestAnimationFrame(this.run);
  };
}
