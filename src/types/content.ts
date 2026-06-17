/** A template element positioned in PERCENT of the artboard (0..100), so the
 *  same template renders at any canvas size. Shared by bundled + REST content. */
export type TemplateElement =
  | {
      kind: 'text';
      text: string;
      xPct: number;
      yPct: number;
      fontPct: number;     // font size as % of artboard height
      fill: string;
      fontFamily: string;
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
    }
  | {
      kind: 'shape';
      shape: 'rectangle' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle';
      xPct: number;
      yPct: number;
      wPct: number;
      hPct: number;
      fill: string;
    };

export interface Template {
  id: string;
  name: string;
  category: string;
  elements: TemplateElement[];
}

export interface ClipartItem {
  id: string;
  name: string;
  tags: string[];
  url: string;
}

export interface ContentLibrary {
  templates: Template[];
  clipart: ClipartItem[];
}
