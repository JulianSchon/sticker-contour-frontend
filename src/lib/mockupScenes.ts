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

// Corner coordinates measured against the generated scene photos (clockwise
// TL, TR, BR, BL, in each photo's natural pixel space).
export const MOCKUP_SCENES: MockupScene[] = [
  {
    id: 'hand',
    labelKey: 'mockHand',
    photo: '/mockups/hand.jpg',
    photoW: 1024,
    photoH: 1024,
    // Quad sits on the upper, clear part of the card — above the thumb — so the
    // sticker never overlaps it and no foreground thumb cutout is needed.
    corners: [{ x: 350, y: 155 }, { x: 635, y: 162 }, { x: 632, y: 495 }, { x: 350, y: 490 }],
  },
  {
    id: 'laptop',
    labelKey: 'mockLaptop',
    photo: '/mockups/laptop.jpg',
    photoW: 1152,
    photoH: 896,
    corners: [{ x: 345, y: 235 }, { x: 935, y: 220 }, { x: 885, y: 665 }, { x: 255, y: 635 }],
  },
  {
    id: 'bottle',
    labelKey: 'mockBottle',
    photo: '/mockups/bottle.jpg',
    photoW: 896,
    photoH: 1152,
    corners: [{ x: 350, y: 330 }, { x: 560, y: 330 }, { x: 560, y: 830 }, { x: 350, y: 830 }],
  },
  {
    id: 'notebook',
    labelKey: 'mockNotebook',
    photo: '/mockups/notebook.jpg',
    photoW: 1152,
    photoH: 896,
    corners: [{ x: 500, y: 175 }, { x: 810, y: 165 }, { x: 805, y: 748 }, { x: 495, y: 752 }],
  },
  {
    id: 'window',
    labelKey: 'mockWindow',
    photo: '/mockups/window.jpg',
    photoW: 1152,
    photoH: 896,
    corners: [{ x: 222, y: 108 }, { x: 862, y: 92 }, { x: 882, y: 562 }, { x: 224, y: 602 }],
  },
];
