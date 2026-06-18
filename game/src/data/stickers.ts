import type { StickerDef, StickerId } from "../types";

export const STICKERS: StickerDef[] = [
  { id: "logo", name: "Classic Nimstick", color: "#ffd400" },
  { id: "shades", name: "Cool Shades", color: "#1f9bff" },
  { id: "mall", name: "Mall Rat", color: "#e6177f" },
  { id: "golden", name: "Golden Stickan", color: "#f0a400" },
];

export const ALL_STICKER_IDS: StickerId[] = STICKERS.map((s) => s.id);

const BY_ID = new Map<StickerId, StickerDef>(STICKERS.map((s) => [s.id, s]));

export function getSticker(id: StickerId): StickerDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown sticker id: ${id}`);
  return def;
}
