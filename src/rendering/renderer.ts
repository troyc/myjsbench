import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { World } from '../physics/world.js';

// Graphics objects pool for rendering ball circles
const graphicsPool: Graphics[] = [];

function getGraphics(): Graphics {
  if (graphicsPool.length > 0) {
    return graphicsPool.pop()!;
  }
  return new Graphics();
}

function returnGraphics(graphics: Graphics): void {
  graphics.clear();
  graphicsPool.push(graphics);
}

export class Renderer {
  private app: Application;
  private activeGraphics: Graphics[] = [];
  private fpsText: Text;
  private tickTimeText: Text;
  private ballCountText: Text;
  private maxTickRateText: Text;
  private textBackground: Graphics;

  constructor() {
    // Create PixiJS Application with 2500x1200 canvas
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

    // Text objects for FPS and tick time display
    const textStyle = new TextStyle({
      fontSize: 20,
      fill: 0xffffff, // White text for better contrast on dark background
    });

    this.fpsText = new Text('FPS: 0', textStyle);
    this.fpsText.x = 10;
    this.fpsText.y = 10;
    this.app.stage.addChild(this.fpsText);

    this.tickTimeText = new Text('Tick: 0.00ms', textStyle);
    this.tickTimeText.x = 10;
    this.tickTimeText.y = 35;
    this.app.stage.addChild(this.tickTimeText);

    this.ballCountText = new Text('Balls: 0', textStyle);
    this.ballCountText.x = 10;
    this.ballCountText.y = 60;
    this.app.stage.addChild(this.ballCountText);

    this.maxTickRateText = new Text('Max Tick Rate: 0', textStyle);
    this.maxTickRateText.x = 10;
    this.maxTickRateText.y = 85;
    this.app.stage.addChild(this.maxTickRateText);

    // Create background for text readability
    this.textBackground = new Graphics();
    this.textBackground.beginFill(0x000000, 0.7); // Black with 70% opacity
    this.textBackground.drawRoundedRect(5, 5, 250, 110, 5); // Rounded rectangle
    this.textBackground.endFill();
    this.app.stage.addChild(this.textBackground);
  }

  // Render function to draw all entities as blue circles with black borders
  render(world: World): void {
    // Return all active graphics to pool
    for (const graphics of this.activeGraphics) {
      this.app.stage.removeChild(graphics);
      returnGraphics(graphics);
    }
    this.activeGraphics = [];

    // Draw all entities
    for (const entity of world.entities) {
      if (!entity.body) continue;

      const graphics = getGraphics();
      
      // Draw blue circle with black border
      graphics.beginFill(0x0000ff); // Blue fill
      graphics.lineStyle(2, 0x000000); // Black border
      graphics.drawCircle(entity.body.x, entity.body.y, entity.body.radius);
      graphics.endFill();

      this.app.stage.addChild(graphics);
      this.activeGraphics.push(graphics);
    }

    // Ensure text and background are rendered on top of balls by moving to front
    this.app.stage.removeChild(this.textBackground);
    this.app.stage.removeChild(this.fpsText);
    this.app.stage.removeChild(this.tickTimeText);
    this.app.stage.removeChild(this.ballCountText);
    this.app.stage.removeChild(this.maxTickRateText);
    
    this.app.stage.addChild(this.textBackground);
    this.app.stage.addChild(this.fpsText);
    this.app.stage.addChild(this.tickTimeText);
    this.app.stage.addChild(this.ballCountText);
    this.app.stage.addChild(this.maxTickRateText);
  }

  // Update performance metrics display
  updateMetrics(fps: number, tickTime: number, ballCount: number): void {
    this.fpsText.text = `FPS: ${Math.round(fps)}`;
    this.tickTimeText.text = `Tick: ${tickTime.toFixed(2)}ms`;
    this.ballCountText.text = `Balls: ${ballCount}`;
    
    // Calculate maximum possible tick rate (1000ms / tick time in ms)
    const maxTickRate = tickTime > 0 ? Math.round(1000 / tickTime) : 0;
    this.maxTickRateText.text = `Max Tick Rate: ${maxTickRate}`;
  }
}