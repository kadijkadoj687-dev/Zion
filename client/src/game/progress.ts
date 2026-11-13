import { DEFAULT_CUSTOMIZATION, sanitizeCustomization, type Customization } from './customization';

export interface RunData {
  playerName: string;
  worldId: number;
  customization?: Customization;
}

export interface GameSave {
  playerName: string;
  unlockedWorld: number;
  bestScore: number;
  customization: Customization;
}

export const PROGRESS_KEY = 'zion-progress-v1';
export const PLAYER_NAME_KEY = 'zion-player-name';

export function getSave(): GameSave {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}');
    if (typeof parsed === 'object' && parsed !== null) {
      const value = parsed as Record<string, unknown>;
      return {
        playerName: sanitizeName(value.playerName) || sanitizeName(localStorage.getItem(PLAYER_NAME_KEY)),
        unlockedWorld: boundedInteger(value.unlockedWorld, 0, 4),
        bestScore: boundedInteger(value.bestScore, 0, 1_000_000_000),
        customization: sanitizeCustomization(value.customization),
      };
    }
  } catch {
    // Damaged local data is replaced with a validated starter save.
  }
  return {
    playerName: sanitizeName(localStorage.getItem(PLAYER_NAME_KEY)),
    unlockedWorld: 0,
    bestScore: 0,
    customization: { ...DEFAULT_CUSTOMIZATION },
  };
}

export function saveGame(save: GameSave): void {
  const safeSave: GameSave = {
    playerName: sanitizeName(save.playerName),
    unlockedWorld: boundedInteger(save.unlockedWorld, 0, 4),
    bestScore: boundedInteger(save.bestScore, 0, 1_000_000_000),
    customization: sanitizeCustomization(save.customization),
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(safeSave));
  localStorage.setItem(PLAYER_NAME_KEY, safeSave.playerName);
}

export function getUnlockedWorld(): number {
  return getSave().unlockedWorld;
}

export function unlockNextWorld(completedWorld: number, score = 0): GameSave {
  const save = getSave();
  save.unlockedWorld = Math.min(4, Math.max(save.unlockedWorld, completedWorld + 1));
  save.bestScore = Math.max(save.bestScore, boundedInteger(score, 0, 1_000_000_000));
  saveGame(save);
  return save;
}

export function sanitizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 18) : '';
}

function boundedInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : minimum;
}
