import type { Template, ClipartItem } from '../types/content.ts';

export const BUNDLED_CLIPART: ClipartItem[] = [
  { id: 'star',  name: 'Star',  tags: ['star', 'favourite', 'rating'], url: '/clipart/star.svg' },
  { id: 'heart', name: 'Heart', tags: ['heart', 'love', 'like'],       url: '/clipart/heart.svg' },
  { id: 'badge', name: 'Badge', tags: ['badge', 'circle', 'ring'],     url: '/clipart/badge.svg' },
  { id: 'arrow', name: 'Arrow', tags: ['arrow', 'direction'],          url: '/clipart/arrow.svg' },
  { id: 'paw',   name: 'Paw',   tags: ['paw', 'pet', 'dog', 'cat'],    url: '/clipart/paw.svg' },
  { id: 'crown', name: 'Crown', tags: ['crown', 'king', 'royal'],      url: '/clipart/crown.svg' },
  { id: 'leaf',  name: 'Leaf',  tags: ['leaf', 'nature', 'plant'],     url: '/clipart/leaf.svg' },
  { id: 'bolt',  name: 'Bolt',  tags: ['bolt', 'lightning', 'energy'], url: '/clipart/bolt.svg' },
];

export const BUNDLED_TEMPLATES: Template[] = [
  {
    id: 'name-badge', name: 'Name badge', category: 'Basics',
    elements: [
      { kind: 'shape', shape: 'roundedRect', xPct: 50, yPct: 50, wPct: 86, hPct: 46, fill: '#ffed00' },
      { kind: 'text', text: 'YOUR NAME', xPct: 50, yPct: 50, fontPct: 13, fill: '#111111', fontFamily: 'Poppins', bold: true, align: 'center' },
    ],
  },
  {
    id: 'circle-logo', name: 'Circle logo', category: 'Basics',
    elements: [
      { kind: 'shape', shape: 'circle', xPct: 50, yPct: 50, wPct: 80, hPct: 80, fill: '#111111' },
      { kind: 'text', text: 'LOGO', xPct: 50, yPct: 50, fontPct: 16, fill: '#ffed00', fontFamily: 'Impact', bold: true, align: 'center' },
    ],
  },
  {
    id: 'quote', name: 'Quote', category: 'Fun',
    elements: [
      { kind: 'shape', shape: 'rectangle', xPct: 50, yPct: 50, wPct: 92, hPct: 60, fill: '#3b82f6' },
      { kind: 'text', text: 'STAY\nWILD', xPct: 50, yPct: 50, fontPct: 18, fill: '#ffffff', fontFamily: 'Impact', bold: true, align: 'center' },
    ],
  },
];
