// MyJSBench - Physics Simulation Benchmark
// Entry point for the application

import { Entity, Body } from './ecs/components.js';
import { World } from './physics/world.js';
import { Renderer } from './rendering/renderer.js';
import { createAppState } from './ui/app-state.js';
import { setupControls } from './ui/controls.js';
import { GameLoop } from './game/game-loop.js';

// Initialize application components
const world = new World();
const renderer = new Renderer();
const appState = createAppState();
const gameLoop = new GameLoop(world, renderer, appState);

// Initialize simulation with starting entities (4 balls with 8 pixel radius)
for (let i = 0; i < 4; i++) {
  const angle = Math.random() * Math.PI * 2;
  const speed = 64; // 64 pixels per second

  const entity = new Entity(
    new Body(
      0, // x position (will be set by addEntity)
      0, // y position (will be set by addEntity)
      Math.cos(angle) * speed, // vx
      Math.sin(angle) * speed, // vy
      8 // radius
    )
  );

  world.addEntity(entity);
}

// Setup UI controls
setupControls(world, appState);

// Start the game loop
requestAnimationFrame(gameLoop.run);

console.log('MyJSBench initialized');
