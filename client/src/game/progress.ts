export interface RunData {
  playerName: string;
  worldId: number;
}

export const PROGRESS_KEY = 'zion-progress-v1';
export const PLAYER_NAME_KEY = 'zion-player-name';

export function getUnlockedWorld(): number {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{"unlockedWorld":0}');
    if (typeof parsed === 'object' && parsed !== null && 'unlockedWorld' in parsed) {
      const value = Number((parsed as { unlockedWorld: unknown }).unlockedWorld);
      return Number.isFinite(value) ? Math.min(4, Math.max(0, value)) : 0;
    }
  } catch {
    // Ignore damaged local save data and safely start from the first world.
  }
  return 0;
}

export function unlockNextWorld(completedWorld: number): void {
  const unlockedWorld = Math.min(4, Math.max(getUnlockedWorld(), completedWorld + 1));
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({ unlockedWorld }));
}
