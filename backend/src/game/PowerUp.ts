import { PowerUpState, Position, PowerUpType } from '@blast-arena/shared';
import { v4 as uuidv4 } from 'uuid';

export class PowerUp {
  public readonly id: string;
  public readonly position: Position;
  public readonly type: PowerUpType;

  constructor(position: Position, type: PowerUpType) {
    this.id = uuidv4();
    this.position = { ...position };
    this.type = type;
  }

  toState(): PowerUpState {
    return {
      id: this.id,
      position: { ...this.position },
      type: this.type,
    };
  }
}
