import { Application, Graphics, Text, TextStyle, Texture, Sprite, ParticleContainer, Container } from 'pixi.js';
import { World } from '../physics/world.js';

export class Renderer {
  private app: Application;
  private ballsContainer: ParticleContainer;
  private uiContainer: Container;
  private gridGraphics: Graphics;
  private activeSprites: Sprite[] = [];
  private spritePool: Sprite[] = [];
  private circleTexture: Texture;
  private readonly baseRadius = 8; // base radius for texture scaling
  private fpsText: Text;
  private tickTimeText: Text;
  private ballCountText: Text;
  private maxTickRateText: Text;
  private textBackground: Graphics;
  private lastGridCellSize = 0;
  private lastGridWidth = 0;
  private lastGridHeight = 0;
  private lastGridScale = 0;

  constructor() {
    // Create PixiJS Application with full world dimensions
    this.app = new Application({
      width: 2500,
      height: 1200,
      backgroundColor: 0xffffff,
    });

    // Append canvas to container
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(this.app.view as HTMLCanvasElement);
    }

    // Stage setup for layering
    this.app.stage.sortableChildren = true;

    // Grid overlay
    this.gridGraphics = new Graphics();
    this.gridGraphics.zIndex = -1;
    this.app.stage.addChild(this.gridGraphics);

    // Containers: balls below, UI above
    this.ballsContainer = new ParticleContainer(10000, {
      position: true,
      scale: true,
      rotation: false,
      uvs: false,
      alpha: false,
    });
    this.ballsContainer.zIndex = 0;
    this.app.stage.addChild(this.ballsContainer);

    this.uiContainer = new Container();
    this.uiContainer.sortableChildren = true;
    this.uiContainer.zIndex = 1;
    this.app.stage.addChild(this.uiContainer);

    // Text objects for FPS and tick time display
    const textStyle = new TextStyle({
      fontSize: 20,
      fill: 0xffffff, // White text for better contrast on dark background
    });

    this.fpsText = new Text('FPS: 0', textStyle);
    this.fpsText.x = 10;
    this.fpsText.y = 10;
    this.uiContainer.addChild(this.fpsText);

    this.tickTimeText = new Text('Tick: 0.00ms', textStyle);
    this.tickTimeText.x = 10;
    this.tickTimeText.y = 35;
    this.uiContainer.addChild(this.tickTimeText);

    this.ballCountText = new Text('Balls: 0', textStyle);
    this.ballCountText.x = 10;
    this.ballCountText.y = 60;
    this.uiContainer.addChild(this.ballCountText);

    this.maxTickRateText = new Text('Max TPS: 0', textStyle);
    this.maxTickRateText.x = 10;
    this.maxTickRateText.y = 85;
    this.uiContainer.addChild(this.maxTickRateText);

    // Create background for text readability
    this.textBackground = new Graphics();
    this.textBackground.beginFill(0x000000, 0.7); // Black with 70% opacity
    this.textBackground.drawRoundedRect(5, 5, 320, 110, 5); // Rounded rectangle
    this.textBackground.endFill();
    this.textBackground.zIndex = -1; // ensure it stays behind text
    this.uiContainer.addChild(this.textBackground);

    // Pre-generate a base circle texture (blue fill with black border)
    this.circleTexture = this.createCircleTexture(this.baseRadius, 0x0000ff, 0x000000, 2);

    // Apply initial scaling to fit viewport (after text elements are created)
    this.updateScale();

    // Handle window resize
    window.addEventListener('resize', () => this.updateScale());
  }

  // Render function to draw all entities as blue circles with black borders
  render(world: World): void {
    this.updateGridOverlay(world);

    // Ensure we have enough sprites
    let used = 0;
    const entities = world.entities;
    for (let i = 0; i < entities.length; i++) {
      const e = entities[i];
      const b = e.body;
      if (!b) continue;

      let sprite: Sprite;
      if (used < this.activeSprites.length) {
        sprite = this.activeSprites[used];
      } else {
        sprite = this.spritePool.pop() ?? new Sprite(this.circleTexture);
        sprite.anchor.set(0.5);
        this.ballsContainer.addChild(sprite);
        this.activeSprites.push(sprite);
      }

      // Switch texture if missing (for pooled sprites)
      if (sprite.texture !== this.circleTexture) {
        sprite.texture = this.circleTexture;
      }

      sprite.position.set(b.x, b.y);
      const scale = b.radius / this.baseRadius;
      sprite.scale.set(scale, scale);
      used++;
    }

    // Return surplus sprites to pool
    for (let i = this.activeSprites.length - 1; i >= used; i--) {
      const sprite = this.activeSprites.pop()!;
      this.ballsContainer.removeChild(sprite);
      this.spritePool.push(sprite);
    }
  }

  // Update performance metrics display
  updateMetrics(fps: number, tickTime: number, tickTimeAvg: number, ballCount: number): void {
    this.fpsText.text = `FPS: ${Math.round(fps)}`;
    this.tickTimeText.text = `Tick: ${tickTime.toFixed(2)}ms (${tickTimeAvg.toFixed(2)}ms avg 1s)`;
    this.ballCountText.text = `Balls: ${ballCount}`;
    
    // Calculate maximum possible tick rate using rolling average (1000ms / tick time in ms)
    const baseline = tickTimeAvg > 0 ? tickTimeAvg : tickTime;
    const maxTickRate = baseline > 0 ? Math.round(1000 / baseline) : 0;
    this.maxTickRateText.text = `Max TPS: ${maxTickRate}`;
  }

  private updateGridOverlay(world: World): void {
    const cellSize = world.getGridCellSize();
    const width = world.width;
    const height = world.height;
    const scale = this.app.stage.scale.x || 1;

    if (
      cellSize === this.lastGridCellSize &&
      width === this.lastGridWidth &&
      height === this.lastGridHeight &&
      scale === this.lastGridScale
    ) {
      return;
    }

    this.lastGridCellSize = cellSize;
    this.lastGridWidth = width;
    this.lastGridHeight = height;
    this.lastGridScale = scale;

    this.gridGraphics.clear();
    if (cellSize <= 0) {
      return;
    }

    const alpha = 0.25;
    const color = 0x808080;
    // Keep line thickness at ~1 screen pixel regardless of stage scale
    const lineWidth = 1 / scale;
    this.gridGraphics.lineStyle({ width: lineWidth, color, alpha, alignment: 0.5 });

    // Offset lines by half a screen pixel in world units to reduce sampling gaps
    const offset = 0.5 / scale;

    for (let x = cellSize; x < width; x += cellSize) {
      const xPos = x + offset;
      this.gridGraphics.moveTo(xPos, 0);
      this.gridGraphics.lineTo(xPos, height);
    }

    for (let y = cellSize; y < height; y += cellSize) {
      const yPos = y + offset;
      this.gridGraphics.moveTo(0, yPos);
      this.gridGraphics.lineTo(width, yPos);
    }
  }

  // Update scale to fit viewport
  private updateScale(): void {
    const maxWidth = window.innerWidth - 40; // 40px for padding
    const maxHeight = window.innerHeight * 0.8; // 80% of viewport height
    
    // Calculate scale to fit within viewport while maintaining aspect ratio
    const scaleX = maxWidth / 2500;
    const scaleY = maxHeight / 1200;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1:1
    
    // Apply scale to stage
    this.app.stage.scale.set(scale, scale);
    
    // Counter-scale text elements to maintain original size and adjust positions
    const counterScale = 1 / scale;
    
    // Reset positions to original values and apply counter-scaling
    this.fpsText.scale.set(counterScale, counterScale);
    this.fpsText.x = 10 * counterScale;
    this.fpsText.y = 10 * counterScale;
    
    this.tickTimeText.scale.set(counterScale, counterScale);
    this.tickTimeText.x = 10 * counterScale;
    this.tickTimeText.y = 35 * counterScale;
    
    this.ballCountText.scale.set(counterScale, counterScale);
    this.ballCountText.x = 10 * counterScale;
    this.ballCountText.y = 60 * counterScale;
    
    this.maxTickRateText.scale.set(counterScale, counterScale);
    this.maxTickRateText.x = 10 * counterScale;
    this.maxTickRateText.y = 85 * counterScale;
    
    // Counter-scale and reposition background
    this.textBackground.scale.set(counterScale, counterScale);
    this.textBackground.x = 5 * counterScale;
    this.textBackground.y = 5 * counterScale;
    
    // Resize renderer to match scaled dimensions
    this.app.renderer.resize(2500 * scale, 1200 * scale);
  }

  // Create a reusable circle texture we can sprite and batch via ParticleContainer
  private createCircleTexture(radius: number, fill: number, stroke: number, strokeWidth: number): Texture {
    const g = new Graphics();
    g.beginFill(fill);
    g.lineStyle(strokeWidth, stroke);
    g.drawCircle(radius + strokeWidth, radius + strokeWidth, radius);
    g.endFill();
    const texture = this.app.renderer.generateTexture(g);
    g.destroy(true);
    return texture;
  }
}
