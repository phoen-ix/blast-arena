/**
 * i18n key helpers for shared constants.
 * These generate namespaced keys that map to game.json / common.json entries.
 * Use with a t() function: t(gameModeName('ffa')) → "Free for All"
 */

export function gameModeName(mode: string): string {
  return `game:modes.${mode}.name`;
}

export function gameModeDescription(mode: string): string {
  return `game:modes.${mode}.description`;
}

export function powerUpName(type: string): string {
  return `game:powerups.${type}.name`;
}

export function powerUpDescription(type: string): string {
  return `game:powerups.${type}.description`;
}
