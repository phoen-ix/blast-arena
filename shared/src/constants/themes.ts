export const THEME_IDS = [
  'inferno',
  'arctic',
  'toxic',
  'crimson',
  'midnight',
  'daylight',
  'sakura',
  'sand',
  'frost',
  'blossom',
  'dune',
] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = 'inferno';

export const THEME_NAMES: Record<ThemeId, string> = {
  inferno: 'Inferno',
  arctic: 'Arctic',
  toxic: 'Toxic',
  crimson: 'Crimson',
  midnight: 'Midnight',
  daylight: 'Daylight',
  sakura: 'Sakura',
  sand: 'Sand',
  frost: 'Frost',
  blossom: 'Blossom',
  dune: 'Dune',
};
