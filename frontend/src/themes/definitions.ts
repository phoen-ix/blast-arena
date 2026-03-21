import type { ThemeId } from '@blast-arena/shared';

export interface ThemeCSSVars {
  primary: string;
  primaryHover: string;
  primaryDim: string;
  primaryGlow: string;
  accent: string;
  accentDim: string;
  danger: string;
  dangerDim: string;
  warning: string;
  warningDim: string;
  success: string;
  successDim: string;
  info: string;
  infoDim: string;
  bgDeep: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgHover: string;
  bgCard: string;
  bgInput: string;
  border: string;
  borderBright: string;
  text: string;
  textDim: string;
  textMuted: string;
  shadowGlowPrimary: string;
  shadowGlowAccent: string;
}

export interface ThemeCanvasColors {
  primary: number;
  primaryHex: string;
  accent: number;
  accentHex: string;
  text: number;
  textHex: string;
  textDim: number;
  textDimHex: string;
  textMuted: number;
  textMutedHex: string;
  bgDeep: number;
  bgBase: number;
  bgSurface: number;
  bgSurfaceHex: string;
  primaryHoverHex: string;
  success: number;
  successHex: string;
  successHoverHex: string;
  danger: number;
  dangerHex: string;
  warning: number;
  warningHex: string;
  info: number;
  infoHex: string;
}

export interface ThemeDefinition {
  css: ThemeCSSVars;
  canvas: ThemeCanvasColors;
}

export const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  inferno: {
    css: {
      primary: '#ff6b35',
      primaryHover: '#ff8555',
      primaryDim: 'rgba(255, 107, 53, 0.12)',
      primaryGlow: '0 0 20px rgba(255, 107, 53, 0.25)',
      accent: '#00d4aa',
      accentDim: 'rgba(0, 212, 170, 0.12)',
      danger: '#ff3355',
      dangerDim: 'rgba(255, 51, 85, 0.12)',
      warning: '#ffaa22',
      warningDim: 'rgba(255, 170, 34, 0.12)',
      success: '#00e676',
      successDim: 'rgba(0, 230, 118, 0.12)',
      info: '#448aff',
      infoDim: 'rgba(68, 138, 255, 0.12)',
      bgDeep: '#080810',
      bgBase: '#0c0c16',
      bgSurface: '#14142a',
      bgElevated: '#1c1c34',
      bgHover: '#24243e',
      bgCard: '#181830',
      bgInput: '#0a0a14',
      border: '#2a2a48',
      borderBright: '#383860',
      text: '#eae8e4',
      textDim: '#8888a0',
      textMuted: '#505068',
      shadowGlowPrimary: '0 0 16px rgba(255, 107, 53, 0.15)',
      shadowGlowAccent: '0 0 16px rgba(0, 212, 170, 0.15)',
    },
    canvas: {
      primary: 0xff6b35,
      primaryHex: '#ff6b35',
      accent: 0x00d4aa,
      accentHex: '#00d4aa',
      text: 0xeae8e4,
      textHex: '#eae8e4',
      textDim: 0x8888a0,
      textDimHex: '#8888a0',
      textMuted: 0x505068,
      textMutedHex: '#505068',
      bgDeep: 0x080810,
      bgBase: 0x0c0c16,
      bgSurface: 0x14142a,
      bgSurfaceHex: '#14142a',
      primaryHoverHex: '#ff8555',
      success: 0x00e676,
      successHex: '#00e676',
      successHoverHex: '#44ff88',
      danger: 0xff3355,
      dangerHex: '#ff3355',
      warning: 0xffaa22,
      warningHex: '#ffaa22',
      info: 0x448aff,
      infoHex: '#448aff',
    },
  },

  arctic: {
    css: {
      primary: '#3ea8ff',
      primaryHover: '#5bb8ff',
      primaryDim: 'rgba(62, 168, 255, 0.12)',
      primaryGlow: '0 0 20px rgba(62, 168, 255, 0.25)',
      accent: '#00e6c8',
      accentDim: 'rgba(0, 230, 200, 0.12)',
      danger: '#ff4466',
      dangerDim: 'rgba(255, 68, 102, 0.12)',
      warning: '#ffbb44',
      warningDim: 'rgba(255, 187, 68, 0.12)',
      success: '#44dd88',
      successDim: 'rgba(68, 221, 136, 0.12)',
      info: '#5599ff',
      infoDim: 'rgba(85, 153, 255, 0.12)',
      bgDeep: '#060a12',
      bgBase: '#0a1018',
      bgSurface: '#101c2e',
      bgElevated: '#182840',
      bgHover: '#203452',
      bgCard: '#142238',
      bgInput: '#080e16',
      border: '#1e3454',
      borderBright: '#2a4468',
      text: '#e4eaf0',
      textDim: '#7a90a8',
      textMuted: '#4a6078',
      shadowGlowPrimary: '0 0 16px rgba(62, 168, 255, 0.15)',
      shadowGlowAccent: '0 0 16px rgba(0, 230, 200, 0.15)',
    },
    canvas: {
      primary: 0x3ea8ff,
      primaryHex: '#3ea8ff',
      accent: 0x00e6c8,
      accentHex: '#00e6c8',
      text: 0xe4eaf0,
      textHex: '#e4eaf0',
      textDim: 0x7a90a8,
      textDimHex: '#7a90a8',
      textMuted: 0x4a6078,
      textMutedHex: '#4a6078',
      bgDeep: 0x060a12,
      bgBase: 0x0a1018,
      bgSurface: 0x101c2e,
      bgSurfaceHex: '#101c2e',
      primaryHoverHex: '#5bb8ff',
      success: 0x44dd88,
      successHex: '#44dd88',
      successHoverHex: '#66ee99',
      danger: 0xff4466,
      dangerHex: '#ff4466',
      warning: 0xffbb44,
      warningHex: '#ffbb44',
      info: 0x5599ff,
      infoHex: '#5599ff',
    },
  },

  toxic: {
    css: {
      primary: '#88ff44',
      primaryHover: '#99ff66',
      primaryDim: 'rgba(136, 255, 68, 0.12)',
      primaryGlow: '0 0 20px rgba(136, 255, 68, 0.25)',
      accent: '#cc44ff',
      accentDim: 'rgba(204, 68, 255, 0.12)',
      danger: '#ff4444',
      dangerDim: 'rgba(255, 68, 68, 0.12)',
      warning: '#ffcc22',
      warningDim: 'rgba(255, 204, 34, 0.12)',
      success: '#44ff88',
      successDim: 'rgba(68, 255, 136, 0.12)',
      info: '#44aaff',
      infoDim: 'rgba(68, 170, 255, 0.12)',
      bgDeep: '#060806',
      bgBase: '#0a100a',
      bgSurface: '#141e14',
      bgElevated: '#1c2e1c',
      bgHover: '#243a24',
      bgCard: '#182818',
      bgInput: '#080c08',
      border: '#2a4a2a',
      borderBright: '#346034',
      text: '#e4f0e4',
      textDim: '#80a880',
      textMuted: '#507050',
      shadowGlowPrimary: '0 0 16px rgba(136, 255, 68, 0.15)',
      shadowGlowAccent: '0 0 16px rgba(204, 68, 255, 0.15)',
    },
    canvas: {
      primary: 0x88ff44,
      primaryHex: '#88ff44',
      accent: 0xcc44ff,
      accentHex: '#cc44ff',
      text: 0xe4f0e4,
      textHex: '#e4f0e4',
      textDim: 0x80a880,
      textDimHex: '#80a880',
      textMuted: 0x507050,
      textMutedHex: '#507050',
      bgDeep: 0x060806,
      bgBase: 0x0a100a,
      bgSurface: 0x141e14,
      bgSurfaceHex: '#141e14',
      primaryHoverHex: '#99ff66',
      success: 0x44ff88,
      successHex: '#44ff88',
      successHoverHex: '#77ffaa',
      danger: 0xff4444,
      dangerHex: '#ff4444',
      warning: 0xffcc22,
      warningHex: '#ffcc22',
      info: 0x44aaff,
      infoHex: '#44aaff',
    },
  },

  crimson: {
    css: {
      primary: '#e63946',
      primaryHover: '#ee5060',
      primaryDim: 'rgba(230, 57, 70, 0.12)',
      primaryGlow: '0 0 20px rgba(230, 57, 70, 0.25)',
      accent: '#ffc846',
      accentDim: 'rgba(255, 200, 70, 0.12)',
      danger: '#ff3344',
      dangerDim: 'rgba(255, 51, 68, 0.12)',
      warning: '#ffa822',
      warningDim: 'rgba(255, 168, 34, 0.12)',
      success: '#44cc66',
      successDim: 'rgba(68, 204, 102, 0.12)',
      info: '#5588ee',
      infoDim: 'rgba(85, 136, 238, 0.12)',
      bgDeep: '#0c0606',
      bgBase: '#120a0a',
      bgSurface: '#221414',
      bgElevated: '#301c1c',
      bgHover: '#3e2424',
      bgCard: '#1c1010',
      bgInput: '#0a0606',
      border: '#4a2a2a',
      borderBright: '#5c3838',
      text: '#f0e4e4',
      textDim: '#a88888',
      textMuted: '#685050',
      shadowGlowPrimary: '0 0 16px rgba(230, 57, 70, 0.15)',
      shadowGlowAccent: '0 0 16px rgba(255, 200, 70, 0.15)',
    },
    canvas: {
      primary: 0xe63946,
      primaryHex: '#e63946',
      accent: 0xffc846,
      accentHex: '#ffc846',
      text: 0xf0e4e4,
      textHex: '#f0e4e4',
      textDim: 0xa88888,
      textDimHex: '#a88888',
      textMuted: 0x685050,
      textMutedHex: '#685050',
      bgDeep: 0x0c0606,
      bgBase: 0x120a0a,
      bgSurface: 0x221414,
      bgSurfaceHex: '#221414',
      primaryHoverHex: '#ee5060',
      success: 0x44cc66,
      successHex: '#44cc66',
      successHoverHex: '#66dd88',
      danger: 0xff3344,
      dangerHex: '#ff3344',
      warning: 0xffa822,
      warningHex: '#ffa822',
      info: 0x5588ee,
      infoHex: '#5588ee',
    },
  },

  midnight: {
    css: {
      primary: '#7c8cf8',
      primaryHover: '#949ef9',
      primaryDim: 'rgba(124, 140, 248, 0.12)',
      primaryGlow: '0 0 20px rgba(124, 140, 248, 0.25)',
      accent: '#64d4c8',
      accentDim: 'rgba(100, 212, 200, 0.12)',
      danger: '#f05060',
      dangerDim: 'rgba(240, 80, 96, 0.12)',
      warning: '#f0a840',
      warningDim: 'rgba(240, 168, 64, 0.12)',
      success: '#50d080',
      successDim: 'rgba(80, 208, 128, 0.12)',
      info: '#60a0f0',
      infoDim: 'rgba(96, 160, 240, 0.12)',
      bgDeep: '#08081a',
      bgBase: '#0c0c22',
      bgSurface: '#141432',
      bgElevated: '#1c1c42',
      bgHover: '#24244e',
      bgCard: '#181840',
      bgInput: '#0a0a18',
      border: '#2e2e5a',
      borderBright: '#3a3a6e',
      text: '#e0dff0',
      textDim: '#8888aa',
      textMuted: '#555570',
      shadowGlowPrimary: '0 0 16px rgba(124, 140, 248, 0.15)',
      shadowGlowAccent: '0 0 16px rgba(100, 212, 200, 0.15)',
    },
    canvas: {
      primary: 0x7c8cf8,
      primaryHex: '#7c8cf8',
      accent: 0x64d4c8,
      accentHex: '#64d4c8',
      text: 0xe0dff0,
      textHex: '#e0dff0',
      textDim: 0x8888aa,
      textDimHex: '#8888aa',
      textMuted: 0x555570,
      textMutedHex: '#555570',
      bgDeep: 0x08081a,
      bgBase: 0x0c0c22,
      bgSurface: 0x141432,
      bgSurfaceHex: '#141432',
      primaryHoverHex: '#949ef9',
      success: 0x50d080,
      successHex: '#50d080',
      successHoverHex: '#70e0a0',
      danger: 0xf05060,
      dangerHex: '#f05060',
      warning: 0xf0a840,
      warningHex: '#f0a840',
      info: 0x60a0f0,
      infoHex: '#60a0f0',
    },
  },
};
