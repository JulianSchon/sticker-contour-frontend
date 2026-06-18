import { describe, it, expect } from "vitest";
import { STICKERS, getSticker, ALL_STICKER_IDS } from "./stickers";

describe("sticker catalog", () => {
  it("exposes four stickers in display order", () => {
    expect(ALL_STICKER_IDS).toEqual(["logo", "shades", "mall", "golden"]);
  });
  it("looks up a sticker by id", () => {
    expect(getSticker("golden").name).toBe("Golden Lion");
  });
  it("has a unique non-empty color and an image for every sticker", () => {
    const colors = STICKERS.map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.every((c) => /^#[0-9a-fA-F]{6}$/.test(c))).toBe(true);
    expect(STICKERS.every((s) => s.img.length > 0)).toBe(true);
  });
});
