# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Create package.json with TypeScript, PixiJS, and build tooling dependencies
  - Configure TypeScript with tsconfig.json for ES modules and strict type checking
  - Set up build script and HTML entry point
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement ECS component classes and Entity structure
  - Create Body class with x, y, vx, vy, and radius properties
  - Create HP class with current and max properties
  - Create Payload class with type and damage properties
  - Create Entity class with optional body, hp, and payload components
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Implement SpatialGrid for efficient collision detection
  - Create SpatialGrid class with cell-based storage using Map
  - Implement constructor to initialize grid dimensions and cell size
  - Implement clear() method to reset all cells
  - Implement insert() method to add entities to appropriate cells
  - Implement query() method to return entities in same and adjacent cells
  - Implement getEntitiesInRadius() method for circular area queries
  - Implement private helper methods for cell key generation and cell lookup
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 4. Implement World class for entity management
  - Create World class with entities array, width, height, and spatialGrid properties
  - Implement constructor to initialize world dimensions and spatial grid
  - Implement addEntity() method to add entities with non-colliding placement (100 attempts, then force spawn)
  - Implement removeEntities() method to halve the entity count
  - Implement update() method to update all entity positions and resolve collisions
  - Implement clone() method to create a deep copy of the world state
  - _Requirements: 7.5, 7.6, 1.2, 2.3, 2.4_

- [x] 5. Implement physics update and collision resolution
  - Implement entity position update based on velocity and deltaTime
  - Implement wall collision detection and velocity reflection for screen boundaries
  - Implement elastic collision detection between entities using spatial grid queries
  - Implement elastic collision resolution with impulse calculation and separation
  - Ensure positions are clamped to valid screen bounds after updates
  - _Requirements: 1.3, 1.4, 1.5, 8.2, 8.3_

- [x] 6. Set up PixiJS application and rendering
  - Create PixiJS Application with 1600x1200 canvas
  - Initialize Graphics objects pool for rendering ball circles
  - Create Text objects for FPS and tick time display in upper left corner
  - Implement render function to draw all entities as blue circles with black borders
  - Implement clear and redraw logic for each frame
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 7. Implement main game loop with fixed timestep
  - Create AppState interface to track render, tick rate, smooth rendering, and timing state
  - Implement requestAnimationFrame loop to drive simulation
  - Implement fixed timestep accumulator for consistent physics updates
  - Call World.update() for each fixed timestep tick
  - Track and calculate tick time for most recent physics update
  - _Requirements: 1.3, 5.2, 6.2, 6.3_

- [x] 8. Implement smooth rendering with partial tick interpolation
  - Add smooth rendering toggle to AppState
  - When smooth rendering enabled, clone world state after fixed timestep updates
  - Calculate remaining time fraction and run partial tick on cloned world
  - Render the interpolated cloned world state
  - Discard cloned world after rendering
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Implement UI controls and button interactions
  - Create HTML buttons for minus, plus, render, tick, and smooth controls
  - Implement minus button handler to halve entity count
  - Implement plus button handler to double entity count
  - Implement render button handler to toggle rendering on/off with state display
  - Implement tick button handler to toggle between 30 and 120 tick rates with state display
  - Implement smooth button handler to toggle smooth rendering with state display
  - _Requirements: 2.1, 2.2, 4.1, 4.4, 5.1, 5.3, 6.1, 6.5_

- [x] 10. Implement FPS and performance metrics display
  - Calculate FPS based on frame timing using exponential moving average
  - Update FPS text display each frame in upper left corner
  - Display tick time in milliseconds in upper left corner
  - Ensure metrics update in real-time during simulation
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 11. Initialize simulation with starting entities
  - Create initial 4 entities with 8 pixel radius
  - Assign random positions within screen bounds
  - Assign random velocities at 64 pixels per second
  - Add entities to world on application startup
  - _Requirements: 1.2, 2.3_

- [ ]* 12. Add integration tests for core simulation behavior
  - Test entity spawning with collision avoidance and forced placement after 100 attempts
  - Test ball doubling and halving operations
  - Test physics updates over multiple ticks for position accuracy
  - Test collision resolution produces correct velocity changes
  - Test smooth rendering produces interpolated positions
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 6.2, 6.3, 6.4_
