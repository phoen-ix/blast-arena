const STORAGE_KEY = 'blast-arena-settings';

export interface VisualSettings {
  animations: boolean;
  screenShake: boolean;
  particles: boolean;
}

const DEFAULTS: VisualSettings = {
  animations: true,
  screenShake: true,
  particles: true,
};

let cached: VisualSettings | null = null;

export function getSettings(): VisualSettings {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      cached = { ...DEFAULTS, ...parsed };
      return cached!;
    }
  } catch { /* ignore */ }
  cached = { ...DEFAULTS };
  return cached!;
}

export function saveSettings(settings: VisualSettings): void {
  cached = { ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
}

export function updateSetting<K extends keyof VisualSettings>(key: K, value: VisualSettings[K]): void {
  const s = getSettings();
  s[key] = value;
  saveSettings(s);
}
