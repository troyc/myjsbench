import { Application, Graphics, Text, TextStyle, Texture, Sprite, ParticleContainer, Container } from 'pixi.js';
import type { GameSimulationState } from '../GameSimulation/GameSimulation.js';

export class Renderer {
  private app: Application;
  private ballsContainer: ParticleContainer;
  private uiContainer: Container;
  private gridGraphics: Graphics;
  private activeSprites: Sprite[] = [];
  private spritePool: Sprite[] = [];
  private circleTexture: Texture;
  private readonly baseRadius = 8;
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
    this.app = new Application({
      width: 2500,
      height: 1200,
      backgroundColor: 0xffffff,
    });

    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.appendChild(this.app.view as HTMLCanvasElement);
    }

    this.app.stage.sortableChildren = true;

    this.gridGraphics = new Graphics();
    this.gridGraphics.zIndex = -1;
    this.app.stage.addChild(this.gridGraphics);

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

    const textStyle = new TextStyle({
      fontSize: 20,
      fill: 0xffffff,
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

    this.textBackground = new Graphics();
    this.textBackground.beginFill(0x000000, 0.7);
    this.textBackground.drawRoundedRect(5, 5, 320, 110, 5);
    this.textBackground.endFill();
    this.textBackground.zIndex = -1;
    this.uiContainer.addChild(this.textBackground);

    this.circleTexture = this.createCircleTexture(this.baseRadius, 0x0000ff, 0x000000, 2);

    this.updateScale();
    window.addEventListener('resize', () => this.updateScale());
  }

  render(state: GameSimulationState): void {
    this.updateGridOverlay(state);

    let used = 0;
    const entities = state.entities;
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

      if (sprite.texture !== this.circleTexture) {
        sprite.texture = this.circleTexture;
      }

      sprite.position.set(b.x, b.y);
      const scale = b.radius / this.baseRadius;
      sprite.scale.set(scale, scale);
      used++;
    }

    for (let i = this.activeSprites.length - 1; i >= used; i--) {
      const sprite = this.activeSprites.pop()!;
      this.ballsContainer.removeChild(sprite);
      this.spritePool.push(sprite);
    }
  }

  updateMetrics(fps: number, tickTime: number, tickTimeAvg: number, ballCount: number): void {
    this.fpsText.text = `FPS: ${Math.round(fps)}`;
    this.tickTimeText.text = `Tick: ${tickTime.toFixed(2)}ms (${tickTimeAvg.toFixed(2)}ms avg 1s)`;
    this.ballCountText.text = `Balls: ${ballCount}`;

    const baseline = tickTimeAvg > 0 ? tickTimeAvg : tickTime;
    const maxTickRate = baseline > 0 ? Math.round(1000 / baseline) : 0;
    this.maxTickRateText.text = `Max TPS: ${maxTickRate}`;
  }

  private updateGridOverlay(state: GameSimulationState): void {
    const cellSize = state.gridCellSize;
    const width = state.width;
    const height = state.height;
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
    const lineWidth = 1 / scale;
    this.gridGraphics.lineStyle({ width: lineWidth, color, alpha, alignment: 0.5 });

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

  private updateScale(): void {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight * 0.8;

    const scaleX = maxWidth / 2500;
    const scaleY = maxHeight / 1200;
    const scale = Math.min(scaleX, scaleY, 1);

    this.app.stage.scale.set(scale, scale);

    const counterScale = 1 / scale;

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

    this.textBackground.scale.set(counterScale, counterScale);
    this.textBackground.x = 5 * counterScale;
    this.textBackground.y = 5 * counterScale;

    this.app.renderer.resize(2500 * scale, 1200 * scale);
  }

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
