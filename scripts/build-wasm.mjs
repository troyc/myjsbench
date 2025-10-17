import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = 'wasm32-unknown-unknown';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const cargoManifest = resolve(projectRoot, 'wasm-sim/Cargo.toml');
const wasmOutput = resolve(projectRoot, 'wasm-sim/target', target, 'release', 'wasm_sim.wasm');
const wasmDest = resolve(projectRoot, 'public/game_simulation.wasm');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result;
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result.stdout;
}

function ensureTargetInstalled() {
  const installed = capture('rustup', ['target', 'list', '--installed']);
  if (!installed.split(/\s+/).includes(target)) {
    run('rustup', ['target', 'add', target]);
  }
}

function buildWasm() {
  ensureTargetInstalled();
  run('cargo', ['build', '--release', '--target', target, '--manifest-path', cargoManifest]);
}

function copyWasm() {
  mkdirSync(dirname(wasmDest), { recursive: true });
  cpSync(wasmOutput, wasmDest);
}

try {
  buildWasm();
  copyWasm();
  console.log('WASM build complete:', wasmDest);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
