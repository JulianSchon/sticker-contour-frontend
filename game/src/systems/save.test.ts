import { describe, it, expect, beforeEach } from "vitest";
import { getAlbum, unlock, isUnlocked, resetAlbum, STORAGE_KEY } from "./save";

beforeEach(() => {
  localStorage.clear();
});

describe("album save", () => {
  it("starts empty", () => {
    expect(getAlbum().unlocked).toEqual([]);
  });
  it("unlocks a sticker and persists it", () => {
    unlock("logo");
    expect(isUnlocked("logo")).toBe(true);
    expect(getAlbum().unlocked).toContain("logo");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("logo");
  });
  it("does not duplicate an already-unlocked sticker", () => {
    unlock("logo");
    unlock("logo");
    expect(getAlbum().unlocked).toEqual(["logo"]);
  });
  it("resets the album", () => {
    unlock("logo");
    resetAlbum();
    expect(getAlbum().unlocked).toEqual([]);
  });
  it("ignores corrupted storage and returns an empty album", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getAlbum().unlocked).toEqual([]);
  });
});
