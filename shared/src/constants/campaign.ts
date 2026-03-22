import {
  EnemyBodyShape,
  EnemyEyeStyle,
  EnemyAccessory,
  EnemyMovementPattern,
  CampaignWinCondition,
} from '../types/campaign';

export const CAMPAIGN_RESPAWN_TICKS = 40; // 2 seconds
export const CAMPAIGN_RESPAWN_INVULNERABILITY = 40; // 2 seconds after respawn
export const ENEMY_ID_OFFSET = 1000; // enemy IDs start at 1000+

export const ENEMY_BODY_SHAPES: EnemyBodyShape[] = [
  'blob',
  'spiky',
  'ghost',
  'robot',
  'bug',
  'skull',
];

export const ENEMY_EYE_STYLES: EnemyEyeStyle[] = ['round', 'angry', 'sleepy', 'crazy'];

export const ENEMY_ACCESSORIES: EnemyAccessory[] = ['none', 'bow_tie', 'monocle', 'bandana'];

export const MOVEMENT_PATTERNS: EnemyMovementPattern[] = [
  'random_walk',
  'chase_player',
  'patrol_path',
  'wall_follow',
  'stationary',
];

export const WIN_CONDITIONS: CampaignWinCondition[] = [
  'kill_all',
  'find_exit',
  'reach_goal',
  'survive_time',
];
