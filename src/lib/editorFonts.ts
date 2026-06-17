/** Phase 1 ships a small curated set of system-safe + bundled fonts.
 *  Phase 2 replaces this with the WordPress /fonts REST manifest. */
export interface EditorFont {
  family: string;
  label: string;
}

export const EDITOR_FONTS: EditorFont[] = [
  { family: 'Poppins', label: 'Poppins' },
  { family: 'Arial', label: 'Arial' },
  { family: 'Georgia', label: 'Georgia' },
  { family: 'Courier New', label: 'Courier' },
  { family: 'Impact', label: 'Impact' },
];

export const DEFAULT_FONT = EDITOR_FONTS[0].family;
