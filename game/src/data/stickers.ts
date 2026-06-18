import type { StickerDef, StickerId } from "../types";

// `img` is the loaded sprite name for the sticker's artwork; `color` is the
// badge backing colour shown behind it.
export const STICKERS: StickerDef[] = [
  { id: "logo", name: "Race Car", color: "#F0322F", img: "sticker-logo" },
  { id: "shades", name: "Loyal Dog", color: "#C9A24B", img: "sticker-shades" },
  { id: "mall", name: "Robo", color: "#1F9BFF", img: "sticker-mall" },
  { id: "golden", name: "Golden Lion", color: "#F0A400", img: "sticker-golden" },
];

export const ALL_STICKER_IDS: StickerId[] = STICKERS.map((s) => s.id);

const BY_ID = new Map<StickerId, StickerDef>(STICKERS.map((s) => [s.id, s]));

export function getSticker(id: StickerId): StickerDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown sticker id: ${id}`);
  return def;
}
