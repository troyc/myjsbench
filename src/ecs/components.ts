// ECS Component Classes

export class Body {
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public radius: number
  ) { }
}

export class HP {
  constructor(
    public current: number,
    public max: number
  ) { }
}

export class Payload {
  constructor(
    public type: string,
    public damage: number
  ) { }
}

export class Entity {
  constructor(
    public body?: Body,
    public hp?: HP,
    public payload?: Payload
  ) { }
}