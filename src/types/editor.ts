import type { ShapeType } from './contour.ts';

export type EditorTool = 'templates' | 'uploads' | 'text' | 'elements' | 'background';

export interface ArtboardSize {
  wCm: number;
  hCm: number;
}

/** Cut configuration for a designed sticker. `mode` selects die-cut vs a
 *  geometric shape; `shapeType` is only meaningful when mode === 'shape'. */
export interface CutSettings {
  mode: 'diecut' | 'shape';
  shapeType: ShapeType;          // reused from contour types (circle/square/triangle)
  borderMm: number;              // sticker-body offset / kiss-perf offset, in mm
  body: 'white' | 'color' | 'none';
  bodyColor: string;             // used when body === 'color'
}

export const DEFAULT_ARTBOARD: ArtboardSize = { wCm: 7, hCm: 7 };

export const DEFAULT_CUT: CutSettings = {
  mode: 'diecut',
  shapeType: 'contour',
  borderMm: 3,
  body: 'white',
  bodyColor: '#ffffff',
};
