// Shared data types used by pure modules and scenes.

export type StickerId =
  | "logo"
  | "shades"
  | "mall"
  | "golden";

export interface StickerDef {
  id: StickerId;
  name: string;
  /** Hex fill used when drawing the placeholder sticker badge. */
  color: string;
}

/** Persisted album state: which sticker ids have been unlocked. */
export interface AlbumState {
  unlocked: StickerId[];
}

export type Tile = string; // single-char symbol used in a level ASCII map

export interface LevelDef {
  id: number;
  name: string;
  /** ASCII rows; symbols resolved by the level scene's tile table. */
  map: Tile[];
  /** Sticker awarded on completion. */
  reward: StickerId;
  /** True for the final boss level. */
  isBoss?: boolean;
}
