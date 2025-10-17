export class Body {
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public radius: number
  ) {}
}

export class HP {
  constructor(public current: number, public max: number) {}
}

export class Payload {
  constructor(public type: string, public damage: number) {}
}

export class Entity {
  private static nextId = 1;
  public readonly id: number;

  constructor(
    public body?: Body,
    public hp?: HP,
    public payload?: Payload,
    id?: number
  ) {
    const assignedId = id ?? Entity.nextId++;
    this.id = assignedId;
    Entity.nextId = Math.max(Entity.nextId, assignedId + 1);
  }
}
