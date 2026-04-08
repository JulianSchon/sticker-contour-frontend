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

  const tx = (v: number) => (v * scaleX + translateX).toFixed(2);
  const ty = (v: number) => (v * scaleY + translateY).toFixed(2);
  const sx = (v: number) => (v * scaleX).toFixed(2); // scale only, no translate (for radii etc.)
  const sy = (v: number) => (v * scaleY).toFixed(2);

  while (i < tokens.length) {
    const cmd = tokens[i++];

    switch (cmd) {
      case 'M': {
        out.push(`M ${tx(parseFloat(tokens[i++]))} ${ty(parseFloat(tokens[i++]))}`);
        break;
      }
      case 'L': {
        out.push(`L ${tx(parseFloat(tokens[i++]))} ${ty(parseFloat(tokens[i++]))}`);
        break;
      }
      case 'C': {
        const x1 = tx(parseFloat(tokens[i++])), y1 = ty(parseFloat(tokens[i++]));
        const x2 = tx(parseFloat(tokens[i++])), y2 = ty(parseFloat(tokens[i++]));
        const x  = tx(parseFloat(tokens[i++])), y  = ty(parseFloat(tokens[i++]));
        out.push(`C ${x1} ${y1} ${x2} ${y2} ${x} ${y}`);
        break;
      }
      case 'A': {
        // A rx ry x-rotation large-arc-flag sweep-flag x y
        const rx   = sx(parseFloat(tokens[i++]));
        const ry   = sy(parseFloat(tokens[i++]));
        const xRot = tokens[i++];
        const large = tokens[i++];
        const sweep = tokens[i++];
        const x    = tx(parseFloat(tokens[i++]));
        const y    = ty(parseFloat(tokens[i++]));
        out.push(`A ${rx} ${ry} ${xRot} ${large} ${sweep} ${x} ${y}`);
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
