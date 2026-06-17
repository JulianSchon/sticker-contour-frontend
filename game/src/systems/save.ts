import type { AlbumState, StickerId } from "../types";
import { ALL_STICKER_IDS } from "../data/stickers";

export const STORAGE_KEY = "nimstick.album.v1";

const EMPTY: AlbumState = { unlocked: [] };

export function getAlbum(): AlbumState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: [] };
    const parsed = JSON.parse(raw) as Partial<AlbumState>;
    const unlocked = Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter((id): id is StickerId =>
          (ALL_STICKER_IDS as string[]).includes(id as string),
        )
      : [];
    return { unlocked };
  } catch {
    return { ...EMPTY };
  }
}

function save(state: AlbumState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function unlock(id: StickerId): void {
  const state = getAlbum();
  if (!state.unlocked.includes(id)) {
    save({ unlocked: [...state.unlocked, id] });
  }
}

export function isUnlocked(id: StickerId): boolean {
  return getAlbum().unlocked.includes(id);
}

export function resetAlbum(): void {
  localStorage.removeItem(STORAGE_KEY);
}
