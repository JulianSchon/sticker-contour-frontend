/**
 * Maximal Rectangles 2D bin packing for arranging sticker copies on a foil roll.
 *
 * Strategy: Best Short Side Fit (BSSF)
 *   - Maintains a list of all maximal free rectangles.
 *   - For each item (sorted by area descending), finds the free rectangle
 *     where the shorter leftover dimension is minimised (tightest fit).
 *   - After placement, splits all overlapping free rectangles into sub-rects
 *     and prunes any that are fully contained within another.
 *
 * This consistently outperforms shelf-based algorithms by filling gaps
 * that are left when items of varying heights are placed.
 */

import type { PlannedFile, PackedCopy, PackResult } from '../types/printPlanning.ts';

export const GAP_MM = 5;

interface Todo {
  fileId: string;
  copyIndex: number;
  w: number;
  h: number;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Split a free rectangle around a placed item (ix,iy,iw,ih — including gap). */
function splitFreeRect(fr: FreeRect, ix: number, iy: number, iw: number, ih: number): FreeRect[] {
  const result: FreeRect[] = [];
  // Right
  if (fr.x + fr.w > ix + iw) {
    result.push({ x: ix + iw, y: fr.y, w: fr.x + fr.w - (ix + iw), h: fr.h });
  }
  // Below
  if (fr.y + fr.h > iy + ih) {
    result.push({ x: fr.x, y: iy + ih, w: fr.w, h: fr.y + fr.h - (iy + ih) });
  }
  // Left
  if (ix > fr.x) {
    result.push({ x: fr.x, y: fr.y, w: ix - fr.x, h: fr.h });
  }
  // Above
  if (iy > fr.y) {
    result.push({ x: fr.x, y: fr.y, w: fr.w, h: iy - fr.y });
  }
  return result;
}

function overlaps(fr: FreeRect, ix: number, iy: number, iw: number, ih: number): boolean {
  return !(ix + iw <= fr.x || ix >= fr.x + fr.w || iy + ih <= fr.y || iy >= fr.y + fr.h);
}

function containedIn(a: FreeRect, b: FreeRect): boolean {
  return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
}

export function packItems(files: PlannedFile[], foilWidthMm: number, maxLengthMm?: number): PackResult {
  const usableW = foilWidthMm - 2 * GAP_MM;
  const LARGE = maxLengthMm != null ? maxLengthMm - 2 * GAP_MM : 1e7;

  const todos: Todo[] = [];
  for (const f of files) {
    for (let i = 0; i < f.quantity; i++) {
      todos.push({ fileId: f.id, copyIndex: i, w: f.widthMm, h: f.heightMm });
    }
  }

  if (todos.length === 0) return { copies: [], totalLengthMm: 0, utilizationPct: 0 };

  // Largest area first for best packing density
  todos.sort((a, b) => b.w * b.h - a.w * a.h);

  // Start with one free rectangle covering the entire usable foil area
  let freeRects: FreeRect[] = [{ x: GAP_MM, y: GAP_MM, w: usableW, h: LARGE }];
  const placed: PackedCopy[] = [];

  for (const todo of todos) {
    let bestFr: FreeRect | null = null;
    let bestRotated = false;
    let bestScore = Infinity;

    for (const fr of freeRects) {
      for (const rotated of [false, true]) {
        const w = rotated ? todo.h : todo.w;
        const h = rotated ? todo.w : todo.h;
        // Each item claims w+GAP_MM × h+GAP_MM to enforce spacing to the next item
        const wEff = w + GAP_MM;
        const hEff = h + GAP_MM;

        if (wEff <= fr.w && hEff <= fr.h) {
          // BSSF: minimise the shorter leftover side (tightest fit)
          const score = Math.min(fr.w - wEff, fr.h - hEff);
          if (score < bestScore) {
            bestScore = score;
            bestFr = fr;
            bestRotated = rotated;
          }
        }
      }
    }

    if (!bestFr) continue; // item too large to fit — skip

    const w = bestRotated ? todo.h : todo.w;
    const h = bestRotated ? todo.w : todo.h;
    const wEff = w + GAP_MM;
    const hEff = h + GAP_MM;

    placed.push({
      id: `${todo.fileId}-${todo.copyIndex}`,
      fileId: todo.fileId,
      copyIndex: todo.copyIndex,
      x: bestFr.x,
      y: bestFr.y,
      w,
      h,
      rotated: bestRotated,
    });

    // Split all free rectangles that overlap the placed area
    const next: FreeRect[] = [];
    for (const fr of freeRects) {
      if (overlaps(fr, bestFr.x, bestFr.y, wEff, hEff)) {
        next.push(...splitFreeRect(fr, bestFr.x, bestFr.y, wEff, hEff));
      } else {
        next.push(fr);
      }
    }

    // Remove free rects that are fully contained within another (O(n²) but n stays small)
    freeRects = next.filter((a, i) => !next.some((b, j) => i !== j && containedIn(a, b)));
  }

  const maxY = placed.reduce((m, c) => Math.max(m, c.y + c.h), 0);
  const totalLengthMm = maxY + GAP_MM;
  const usedArea = placed.reduce((s, c) => s + c.w * c.h, 0);
  const utilizationPct = Math.round((usedArea / (foilWidthMm * totalLengthMm)) * 1000) / 10;

  return { copies: placed, totalLengthMm, utilizationPct };
}
