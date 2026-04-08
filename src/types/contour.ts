export type ShapeType = 'contour' | 'circle' | 'square' | 'triangle';

export interface ContourParams {
  threshold: number;
  kissOffset: number;
  perfOffset: number;
  smoothing: number;
  enclose: boolean;
  cutMode: 'kiss' | 'perf' | 'both';
  shapeType: ShapeType;
  shapeSize: number; // 10-100 percent of image dimensions
}

export interface ContourPreviewResponse {
  kissSvgPath: string;
  perfSvgPath: string | null;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  pad: number;
}
