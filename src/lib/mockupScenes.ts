import type { Pt } from './cornerPin.ts';
import type { T } from './i18n.ts';

export interface MockupScene {
  id: string;
  /** i18n key for the human label. */
  labelKey: keyof T;
  /** Public path to the scene photo. */
  photo: string;
  /** The photo's intrinsic pixel dimensions. */
  photoW: number;
  photoH: number;
  /** Sticker placement quad in photo px, clockwise: [TL, TR, BR, BL]. */
  corners: [Pt, Pt, Pt, Pt];
  /** Optional PNG (same size as photo) drawn ABOVE the sticker, e.g. a thumb. */
  foreground?: string;
}

// NOTE: corner coordinates below are provisional and will be re-measured against
// the generated scene photos. Only the shape/paths are final here.
export const MOCKUP_SCENES: MockupScene[] = [
  {
    id: 'hand',
    labelKey: 'mockHand',
    photo: '/mockups/hand.jpg',
    photoW: 1024,
    photoH: 1024,
    corners: [{ x: 420, y: 360 }, { x: 700, y: 360 }, { x: 700, y: 700 }, { x: 420, y: 700 }],
  },
  {
    id: 'laptop',
    labelKey: 'mockLaptop',
    photo: '/mockups/laptop.jpg',
    photoW: 1024,
    photoH: 768,
    corners: [{ x: 420, y: 250 }, { x: 640, y: 250 }, { x: 640, y: 470 }, { x: 420, y: 470 }],
  },
  {
    id: 'bottle',
    labelKey: 'mockBottle',
    photo: '/mockups/bottle.jpg',
    photoW: 768,
    photoH: 1024,
    corners: [{ x: 300, y: 420 }, { x: 500, y: 420 }, { x: 500, y: 680 }, { x: 300, y: 680 }],
  },
  {
    id: 'notebook',
    labelKey: 'mockNotebook',
    photo: '/mockups/notebook.jpg',
    photoW: 1024,
    photoH: 768,
    corners: [{ x: 430, y: 250 }, { x: 660, y: 250 }, { x: 660, y: 500 }, { x: 430, y: 500 }],
  },
  {
    id: 'window',
    labelKey: 'mockWindow',
    photo: '/mockups/window.jpg',
    photoW: 1024,
    photoH: 768,
    corners: [{ x: 460, y: 230 }, { x: 720, y: 230 }, { x: 720, y: 490 }, { x: 460, y: 490 }],
  },
];
