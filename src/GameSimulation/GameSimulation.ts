import { Entity, Body } from './components.js';
import { World } from './world.js';

export interface GameSimulationState {
  entities: readonly Entity[];
  width: number;
  height: number;
  gridCellSize: number;
}

export type SimulationCommand =
  | { type: 'spawn_random_entities'; count: number; radius: number; speed: number }
  | { type: 'remove_half_entities' }
  | { type: 'adjust_grid_cell_size'; delta: number }
  | { type: 'set_grid_cell_size'; size: number }
  | { type: 'scale_radius'; factor: number };

export class GameSimulation {
  private world: World;

  constructor() {
    this.world = new World();
  }

  next_tick(commands: SimulationCommand[], deltaTime: number): void {
    if (commands.length > 0) {
      this.applyCommands(commands);
    }

    if (deltaTime > 0) {
      this.world.update(deltaTime);
    }
  }

  get_state(): GameSimulationState {
    return {
      entities: this.world.entities,
      width: this.world.width,
      height: this.world.height,
      gridCellSize: this.world.getGridCellSize(),
    };
  }

  preview_state(deltaTime: number): GameSimulationState {
    const previewWorld = this.world.clone();
    if (deltaTime > 0) {
      previewWorld.update(deltaTime);
    }

    return {
      entities: previewWorld.entities,
      width: previewWorld.width,
      height: previewWorld.height,
      gridCellSize: previewWorld.getGridCellSize(),
    };
  }

  private applyCommands(commands: SimulationCommand[]): void {
    for (const command of commands) {
      switch (command.type) {
        case 'spawn_random_entities': {
          this.spawnRandomEntities(command.count, command.radius, command.speed);
          break;
        }
        case 'remove_half_entities': {
          this.world.removeEntities();
          break;
        }
        case 'adjust_grid_cell_size': {
          this.world.adjustGridCellSize(command.delta);
          break;
        }
        case 'set_grid_cell_size': {
          this.world.setGridCellSize(command.size);
          break;
        }
        case 'scale_radius': {
          this.world.scaleRadii(command.factor);
          break;
        }
        default: {
          const exhaustiveCheck: never = command;
          throw new Error(`Unhandled SimulationCommand: ${JSON.stringify(exhaustiveCheck)}`);
        }
      }
    }
  }

  private spawnRandomEntities(count: number, radius: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const entity = new Entity(
        new Body(
          0,
          0,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          radius
        )
      );
      this.world.addEntity(entity);
    }
  }
}
