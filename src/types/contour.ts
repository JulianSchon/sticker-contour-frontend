export interface ContourParams {
  threshold: number;
  kissOffset: number;
  perfOffset: number;
  smoothing: number;
  enclose: boolean;
  cutMode: 'kiss' | 'perf' | 'both';
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
