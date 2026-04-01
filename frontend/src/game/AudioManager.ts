/**
 * Central audio manager for BlastArena.
 * Uses Web Audio API with procedural sound generation (no audio files).
 * Respects user volume settings. Lazy AudioContext creation on first interaction.
 */

import { SoundGenerator } from './SoundGenerator';

const STORAGE_KEY = 'blast-arena-audio';

interface AudioSettings {
  masterVolume: number; // 0-1
  sfxVolume: number; // 0-1
  muted: boolean;
}

const DEFAULTS: AudioSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
};

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private generator: SoundGenerator | null = null;
  private settings: AudioSettings;
  private initialized = false;

  constructor() {
    this.settings = this.loadSettings();
  }

  /** Must be called from a user gesture (click/keydown) to unlock AudioContext */
  init(): void {
    if (this.initialized) return;

    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.generator = new SoundGenerator(this.ctx, this.sfxGain);
      this.applyVolume();
      this.initialized = true;
    } catch {
      // Web Audio API not available
    }
  }

  private ensureResumed(): boolean {
    if (!this.ctx || !this.generator) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx.state !== 'closed';
  }

  // --- Sound effects ---

  explosion(distance?: number): void {
    if (!this.ensureResumed()) return;
    this.generator!.explosion(distance);
  }

  bombPlace(): void {
    if (!this.ensureResumed()) return;
    this.generator!.bombPlace();
  }

  bombTick(urgency: number): void {
    if (!this.ensureResumed()) return;
    this.generator!.bombTick(urgency);
  }

  powerUpCollect(): void {
    if (!this.ensureResumed()) return;
    this.generator!.powerUpCollect();
  }

  death(): void {
    if (!this.ensureResumed()) return;
    this.generator!.death();
  }

  shieldBreak(): void {
    if (!this.ensureResumed()) return;
    this.generator!.shieldBreak();
  }

  kick(): void {
    if (!this.ensureResumed()) return;
    this.generator!.kick();
  }

  bombThrow(): void {
    if (!this.ensureResumed()) return;
    this.generator!.bombThrow();
  }

  countdownBeep(): void {
    if (!this.ensureResumed()) return;
    this.generator!.countdownBeep();
  }

  countdownGo(): void {
    if (!this.ensureResumed()) return;
    this.generator!.countdownGo();
  }

  victory(): void {
    if (!this.ensureResumed()) return;
    this.generator!.victory();
  }

  defeat(): void {
    if (!this.ensureResumed()) return;
    this.generator!.defeat();
  }

  uiClick(): void {
    if (!this.ensureResumed()) return;
    this.generator!.uiClick();
  }

  step(): void {
    if (!this.ensureResumed()) return;
    this.generator!.step();
  }

  // --- Volume control ---

  private applyVolume(): void {
    if (!this.masterGain || !this.sfxGain) return;
    const effective = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setValueAtTime(effective, this.ctx!.currentTime);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.ctx!.currentTime);
  }

  setMasterVolume(vol: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
    this.applyVolume();
    this.saveSettings();
  }

  setSfxVolume(vol: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, vol));
    this.applyVolume();
    this.saveSettings();
  }

  toggleMute(): void {
    this.settings.muted = !this.settings.muted;
    this.applyVolume();
    this.saveSettings();
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.applyVolume();
    this.saveSettings();
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  getMasterVolume(): number {
    return this.settings.masterVolume;
  }

  getSfxVolume(): number {
    return this.settings.sfxVolume;
  }

  // --- Persistence ---

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          return { ...DEFAULTS, ...parsed };
        }
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULTS };
  }

  private saveSettings(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }
}

/** Singleton audio manager */
export const audioManager = new AudioManagerImpl();
