import { Body, Entity } from './components.js';
import type { GameSimulationState, SimulationCommand } from './GameSimulation.js';

const BASE_URL = import.meta.env.BASE_URL ?? '/';

interface WasmSimulationExports {
  readonly memory: WebAssembly.Memory;
  sim_init(): void;
  sim_spawn_random_entities(count: number, radius: number, speed: number): void;
  sim_remove_half_entities(): void;
  sim_adjust_grid_cell_size(delta: number): number;
  sim_set_grid_cell_size(size: number): number;
  sim_scale_radius(factor: number): void;
  sim_update(deltaTime: number): void;
  sim_get_state_ptr(): number;
  sim_get_state_len(): number;
  sim_preview(deltaTime: number): void;
  sim_get_preview_ptr(): number;
  sim_get_preview_len(): number;
  sim_get_width(): number;
  sim_get_height(): number;
  sim_get_grid_cell_size(): number;
  sim_get_entity_stride(): number;
}

let wasmExportsPromise: Promise<WasmSimulationExports> | null = null;

async function loadWasmModule(): Promise<WasmSimulationExports> {
  if (!wasmExportsPromise) {
    wasmExportsPromise = (async () => {
      const wasmUrl = `${BASE_URL}game_simulation.wasm`;

      if ('instantiateStreaming' in WebAssembly) {
        try {
          const response = await fetch(wasmUrl);
          const { instance } = await WebAssembly.instantiateStreaming(response, {});
          return instance.exports as unknown as WasmSimulationExports;
        } catch (error) {
          console.warn('streaming WASM instantiation failed, falling back to ArrayBuffer', error);
        }
      }

      const response = await fetch(wasmUrl);
      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return instance.exports as unknown as WasmSimulationExports;
    })();
  }
  return wasmExportsPromise;
}

export class GameSimulationWasm {
  private readonly exports: WasmSimulationExports;
  private readonly baseEntities: Entity[] = [];
  private readonly previewEntities: Entity[] = [];
  private readonly baseState: GameSimulationState;
  private readonly previewState: GameSimulationState;
  private readonly width: number;
  private readonly height: number;
  private readonly entityStride: number;

  private constructor(exports: WasmSimulationExports) {
    this.exports = exports;
    this.width = this.exports.sim_get_width();
    this.height = this.exports.sim_get_height();
    this.entityStride = this.exports.sim_get_entity_stride();

    this.baseState = {
      entities: this.baseEntities,
      width: this.width,
      height: this.height,
      gridCellSize: this.exports.sim_get_grid_cell_size(),
    };

    this.previewState = {
      entities: this.previewEntities,
      width: this.width,
      height: this.height,
      gridCellSize: this.baseState.gridCellSize,
    };

    this.updateBaseState();
  }

  static async create(): Promise<GameSimulationWasm> {
    const exports = await loadWasmModule();
    exports.sim_init();
    return new GameSimulationWasm(exports);
  }

  next_tick(commands: SimulationCommand[], deltaTime: number): void {
    if (commands.length > 0) {
      this.applyCommands(commands);
    }

    if (deltaTime > 0) {
      this.exports.sim_update(deltaTime);
    }

    this.updateBaseState();
  }

  get_state(): GameSimulationState {
    return this.baseState;
  }

  preview_state(deltaTime: number): GameSimulationState {
    this.exports.sim_preview(deltaTime);
    const ptr = this.exports.sim_get_preview_ptr();
    const len = this.exports.sim_get_preview_len();
    this.syncEntities(ptr, len, this.previewEntities);
    this.previewState.gridCellSize = this.exports.sim_get_grid_cell_size();
    return this.previewState;
  }

  private applyCommands(commands: SimulationCommand[]): void {
    for (const command of commands) {
      switch (command.type) {
        case 'spawn_random_entities': {
          this.exports.sim_spawn_random_entities(command.count, command.radius, command.speed);
          break;
        }
        case 'remove_half_entities': {
          this.exports.sim_remove_half_entities();
          break;
        }
        case 'adjust_grid_cell_size': {
          const size = this.exports.sim_adjust_grid_cell_size(command.delta);
          this.baseState.gridCellSize = size;
          break;
        }
        case 'set_grid_cell_size': {
          const size = this.exports.sim_set_grid_cell_size(command.size);
          this.baseState.gridCellSize = size;
          break;
        }
        case 'scale_radius': {
          this.exports.sim_scale_radius(command.factor);
          break;
        }
        default: {
          const exhaustiveCheck: never = command;
          throw new Error(`Unhandled SimulationCommand in WASM adapter: ${JSON.stringify(exhaustiveCheck)}`);
        }
      }
    }
  }

  private updateBaseState(): void {
    const ptr = this.exports.sim_get_state_ptr();
    const len = this.exports.sim_get_state_len();
    this.syncEntities(ptr, len, this.baseEntities);
    this.baseState.gridCellSize = this.exports.sim_get_grid_cell_size();
  }

  private syncEntities(ptr: number, len: number, target: Entity[]): void {
    if (len === 0 || ptr === 0) {
      target.length = 0;
      return;
    }

    const memory = this.exports.memory.buffer;
    const view = new DataView(memory, ptr, len * this.entityStride);
    for (let i = 0; i < len; i++) {
      let offset = i * this.entityStride;
      const id = view.getUint32(offset, true);
      offset += 4;
      const hasBody = view.getUint32(offset, true) === 1;
      offset += 4;

      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const vx = view.getFloat32(offset, true);
      offset += 4;
      const vy = view.getFloat32(offset, true);
      offset += 4;
      const radius = view.getFloat32(offset, true);
      offset += 4;

      let entity = target[i];
      if (!entity || entity.id !== id) {
        entity = new Entity(undefined, undefined, undefined, id);
        target[i] = entity;
      }

      if (hasBody) {
        let body = entity.body;
        if (!body) {
          body = new Body(x, y, vx, vy, radius);
          entity.body = body;
        } else {
          body.x = x;
          body.y = y;
          body.vx = vx;
          body.vy = vy;
          body.radius = radius;
        }
      } else {
        entity.body = undefined;
      }
    }

    target.length = len;
  }
}
