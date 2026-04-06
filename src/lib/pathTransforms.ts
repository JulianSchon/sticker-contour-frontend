/**
 * Client-side SVG path utilities for the live canvas preview.
 * These functions apply visual approximations of offset and smoothing
 * without a server round-trip, giving instant feedback when sliders change.
 */

/**
 * Scales an SVG path `d` string from one coordinate space to another.
 * Used to map from bitmap pixel coords to canvas pixel coords.
 */
export function scalePath(
  svgPath: string,
  scaleX: number,
  scaleY: number,
  translateX = 0,
  translateY = 0
): string {
  const tokens = svgPath.trim().split(/\s+/);
  const out: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i++];

    switch (cmd) {
      case 'M': {
        const x = parseFloat(tokens[i++]) * scaleX + translateX;
        const y = parseFloat(tokens[i++]) * scaleY + translateY;
        out.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
        break;
      }
      case 'C': {
        const x1 = parseFloat(tokens[i++]) * scaleX + translateX;
        const y1 = parseFloat(tokens[i++]) * scaleY + translateY;
        const x2 = parseFloat(tokens[i++]) * scaleX + translateX;
        const y2 = parseFloat(tokens[i++]) * scaleY + translateY;
        const x = parseFloat(tokens[i++]) * scaleX + translateX;
        const y = parseFloat(tokens[i++]) * scaleY + translateY;
        out.push(`C ${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`);
        break;
      }
      case 'Z':
      case 'z':
        out.push('Z');
        break;
      default:
        break;
    }
  }

  return out.join(' ');
}
