# Requirements Document

## Introduction

MyJSBench is a TypeScript-based physics simulation benchmark that visualizes bouncing balls with elastic collisions using PixiJS for rendering. The benchmark provides interactive controls to adjust simulation parameters and measures performance metrics including FPS and tick time. The system uses an Entity Component System (ECS) architecture with a spatial grid for efficient collision detection.

## Glossary

- **MyJSBench**: The benchmark application system
- **Entity**: A game object composed of optional components (Body, HP, Payload)
- **Body**: A component containing position (x, y) and radius data
- **HP**: A component containing current and maximum health points
- **Payload**: A component containing type and damage data
- **World**: The container class managing all entities and simulation state
- **Spatial Grid**: A static grid data structure for efficient collision detection
- **Tick**: A discrete simulation update step with a fixed deltaTime
- **Smooth Rendering**: An interpolation technique that renders a partial tick to align visuals with current time
- **Elastic Collision**: A collision where kinetic energy is conserved

## Requirements

### Requirement 1

**User Story:** As a benchmark user, I want to see balls bouncing around the screen with realistic physics, so that I can evaluate rendering and physics performance.

#### Acceptance Criteria

1. THE MyJSBench SHALL render blue circles with black borders representing balls on a 1600x1200 pixel canvas
2. WHEN the simulation starts, THE MyJSBench SHALL initialize 4 balls with 8 pixel radius and random velocities of 64 pixels per second
3. THE MyJSBench SHALL update ball positions each tick based on velocity and deltaTime
4. WHEN two balls collide, THE MyJSBench SHALL resolve the collision using elastic collision physics
5. WHEN a ball reaches a screen boundary, THE MyJSBench SHALL reflect the ball velocity to simulate a wall bounce

### Requirement 2

**User Story:** As a benchmark user, I want to control the number of balls in the simulation, so that I can test performance under different loads.

#### Acceptance Criteria

1. WHEN the user clicks the minus button, THE MyJSBench SHALL double the current number of balls
2. WHEN the user clicks the plus button, THE MyJSBench SHALL halve the current number of balls
3. WHEN new balls are added, THE MyJSBench SHALL place them at random positions with random velocities of 64 pixels per second
4. WHEN new balls are added, THE MyJSBench SHALL ensure no ball is placed in a colliding position with existing balls

### Requirement 3

**User Story:** As a benchmark user, I want to see real-time performance metrics, so that I can measure the efficiency of the simulation.

#### Acceptance Criteria

1. THE MyJSBench SHALL display the current frames per second (FPS) in the upper left corner of the screen
2. THE MyJSBench SHALL display the tick time in milliseconds in the upper left corner of the screen
3. THE MyJSBench SHALL update the FPS display each frame
4. THE MyJSBench SHALL update the tick time display to show the duration of the most recent tick

### Requirement 4

**User Story:** As a benchmark user, I want to toggle rendering on and off, so that I can measure pure physics performance without rendering overhead.

#### Acceptance Criteria

1. WHEN the user clicks the render button, THE MyJSBench SHALL toggle rendering between enabled and disabled states
2. WHILE rendering is disabled, THE MyJSBench SHALL continue updating physics simulation
3. WHILE rendering is disabled, THE MyJSBench SHALL not draw balls to the canvas
4. THE MyJSBench SHALL display the current rendering state on the render button

### Requirement 5

**User Story:** As a benchmark user, I want to adjust the tick rate, so that I can test performance at different simulation frequencies.

#### Acceptance Criteria

1. WHEN the user clicks the tick button, THE MyJSBench SHALL toggle the tick rate between 30 ticks per second and 120 ticks per second
2. THE MyJSBench SHALL update the simulation at the selected tick rate
3. THE MyJSBench SHALL display the current tick rate on the tick button

### Requirement 6

**User Story:** As a benchmark user, I want to enable smooth rendering, so that I can see interpolated motion between ticks for smoother visuals.

#### Acceptance Criteria

1. WHEN the user clicks the smooth button, THE MyJSBench SHALL toggle smooth rendering between enabled and disabled states
2. WHILE smooth rendering is enabled, THE MyJSBench SHALL clone the world state after advancing to the most recent tick
3. WHILE smooth rendering is enabled, THE MyJSBench SHALL execute a partial tick with adjusted deltaTime to align with current time
4. WHILE smooth rendering is enabled, THE MyJSBench SHALL render the interpolated world state and discard it after rendering
5. THE MyJSBench SHALL display the current smooth rendering state on the smooth button

### Requirement 7

**User Story:** As a developer, I want entities organized using an ECS architecture, so that the codebase is maintainable and extensible.

#### Acceptance Criteria

1. THE MyJSBench SHALL define an Entity class with optional Body, HP, and Payload components
2. THE MyJSBench SHALL define a Body class with x position, y position, and radius fields
3. THE MyJSBench SHALL define an HP class with current and max fields
4. THE MyJSBench SHALL define a Payload class with type and damage fields
5. THE MyJSBench SHALL store all entities in a World class
6. THE MyJSBench SHALL implement an update method on entities that accepts deltaTime as a parameter

### Requirement 8

**User Story:** As a developer, I want efficient collision detection, so that the simulation can handle many entities without performance degradation.

#### Acceptance Criteria

1. THE MyJSBench SHALL implement a static spatial grid data structure for collision detection
2. WHEN updating entity positions, THE MyJSBench SHALL use the spatial grid to query nearby entities
3. THE MyJSBench SHALL check for collisions only between entities in the same or adjacent grid cells
4. THE MyJSBench SHALL update the spatial grid each tick to reflect current entity positions
