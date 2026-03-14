import { describe, it, expect } from '@jest/globals';
import { Bomb } from '../../../backend/src/game/Bomb';
import { BOMB_TIMER_TICKS } from '@blast-arena/shared';

describe('Bomb', () => {
  it('should create a bomb with correct properties', () => {
    const bomb = new Bomb({ x: 5, y: 3 }, 1, 2);
    expect(bomb.position).toEqual({ x: 5, y: 3 });
    expect(bomb.ownerId).toBe(1);
    expect(bomb.fireRange).toBe(2);
    expect(bomb.ticksRemaining).toBe(BOMB_TIMER_TICKS);
  });

  it('should count down and detonate', () => {
    const bomb = new Bomb({ x: 0, y: 0 }, 1, 1);
    for (let i = 0; i < BOMB_TIMER_TICKS - 1; i++) {
      expect(bomb.tick()).toBe(false);
    }
    expect(bomb.tick()).toBe(true); // Should detonate
  });

  it('should serialize to state correctly', () => {
    const bomb = new Bomb({ x: 3, y: 7 }, 2, 3);
    const state = bomb.toState();
    expect(state.position).toEqual({ x: 3, y: 7 });
    expect(state.ownerId).toBe(2);
    expect(state.fireRange).toBe(3);
    expect(state.ticksRemaining).toBe(BOMB_TIMER_TICKS);
    expect(state.id).toBe(bomb.id);
  });
});
