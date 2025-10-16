import { World } from '../physics/world.js';
import { Entity, Body } from '../ecs/components.js';
import { AppState } from './app-state.js';

export function setupControls(world: World, appState: AppState): void {
  const gridInfo = document.getElementById('grid-info');

  const updateGridInfo = (): void => {
    if (!gridInfo) return;

    const cellSize = world.getGridCellSize();
    const cellCount = world.getGridCellCount();
    gridInfo.textContent = `Grid Cell: ${Math.round(cellSize)}px | Cells: ${cellCount}`;
  };

  // Minus button handler to halve entity count
  const minusBtn = document.getElementById('minus-btn');
  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      world.removeEntities();
    });
  }

  // Plus button handler to double entity count
  const plusBtn = document.getElementById('plus-btn');
  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      const currentCount = world.entities.length;

      for (let i = 0; i < currentCount; i++) {
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
    });
  }

  // Grid cell size decrease button handler
  const gridMinusBtn = document.getElementById('grid-minus-btn');
  if (gridMinusBtn) {
    gridMinusBtn.addEventListener('click', () => {
      world.adjustGridCellSize(-8);
      updateGridInfo();
    });
  }

  // Grid cell size increase button handler
  const gridPlusBtn = document.getElementById('grid-plus-btn');
  if (gridPlusBtn) {
    gridPlusBtn.addEventListener('click', () => {
      world.adjustGridCellSize(8);
      updateGridInfo();
    });
  }

  // Render button handler to toggle rendering on/off with state display
  const renderBtn = document.getElementById('render-btn');
  if (renderBtn) {
    renderBtn.addEventListener('click', () => {
      appState.renderEnabled = !appState.renderEnabled;
      renderBtn.textContent = `Render: ${appState.renderEnabled ? 'ON' : 'OFF'}`;
    });
  }

  // Tick button handler to toggle between 30 and 120 tick rates with state display
  const tickBtn = document.getElementById('tick-btn');
  if (tickBtn) {
    tickBtn.addEventListener('click', () => {
      appState.tickRate = appState.tickRate === 30 ? 120 : 30;
      tickBtn.textContent = `Tick: ${appState.tickRate}`;
    });
  }

  // Smooth button handler to toggle smooth rendering with state display
  const smoothBtn = document.getElementById('smooth-btn');
  if (smoothBtn) {
    smoothBtn.addEventListener('click', () => {
      appState.smoothEnabled = !appState.smoothEnabled;
      smoothBtn.textContent = `Smooth: ${appState.smoothEnabled ? 'ON' : 'OFF'}`;
    });
  }

  // Radius decrease button handler - two presses halve the radius
  const radiusMinusBtn = document.getElementById('radius-minus-btn');
  if (radiusMinusBtn) {
    radiusMinusBtn.addEventListener('click', () => {
      const scaleFactor = 1 / Math.sqrt(2); // Two presses = 1/2 radius

      for (const entity of world.entities) {
        if (entity.body) {
          entity.body.radius *= scaleFactor;
        }
      }
    });
  }

  // Radius increase button handler - two presses double the radius
  const radiusPlusBtn = document.getElementById('radius-plus-btn');
  if (radiusPlusBtn) {
    radiusPlusBtn.addEventListener('click', () => {
      const scaleFactor = Math.sqrt(2); // Two presses = 2x radius

      for (const entity of world.entities) {
        if (entity.body) {
          entity.body.radius *= scaleFactor;
        }
      }
    });
  }

  updateGridInfo();
}
