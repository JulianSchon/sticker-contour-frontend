export interface PlannedFile {
  id: string;
  file: File;
  name: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  color: string;
  previewUrl?: string;   // data URL of the first PDF page, generated client-side
}

export interface PackedCopy {
  id: string;        // `${fileId}-${copyIndex}`
  fileId: string;
  copyIndex: number;
  x: number;         // mm from left edge of foil
  y: number;         // mm from top edge of foil
  w: number;         // mm width (may be swapped by rotation)
  h: number;         // mm height
  rotated: boolean;
}

export interface PackResult {
  copies: PackedCopy[];
  totalLengthMm: number;
  utilizationPct: number;
}

export interface ExportCopy {
  fileIndex: number;
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;
  rotated: boolean;
}
