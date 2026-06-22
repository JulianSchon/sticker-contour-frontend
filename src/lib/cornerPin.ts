export interface Pt {
  x: number;
  y: number;
}

// 3x3 matrices are stored row-major as length-9 arrays.
type Mat3 = [number, number, number, number, number, number, number, number, number];

function adjugate(m: Mat3): Mat3 {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

function multMat(a: Mat3, b: Mat3): Mat3 {
  const c = new Array<number>(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) sum += a[3 * i + k] * b[3 * k + j];
      c[3 * i + j] = sum;
    }
  }
  return c as Mat3;
}

function multVec(m: Mat3, v: [number, number, number]): [number, number, number] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

// Map the projective basis onto four points (clockwise: TL, TR, BR, BL).
function basisToPoints(p: [Pt, Pt, Pt, Pt]): Mat3 {
  const m: Mat3 = [
    p[0].x, p[1].x, p[2].x,
    p[0].y, p[1].y, p[2].y,
    1, 1, 1,
  ];
  const v = multVec(adjugate(m), [p[3].x, p[3].y, 1]);
  return multMat(m, [
    v[0], 0, 0,
    0, v[1], 0,
    0, 0, v[2],
  ]);
}

/**
 * Projective transform mapping the source rectangle (0,0)-(w,h) onto `dst`
 * (clockwise from top-left). Returned row-major 3x3, normalized so H[8] === 1.
 */
export function solveHomography(w: number, h: number, dst: [Pt, Pt, Pt, Pt]): Mat3 {
  const src: [Pt, Pt, Pt, Pt] = [
    { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
  ];
  const s = basisToPoints(src);
  const d = basisToPoints(dst);
  const H = multMat(d, adjugate(s));
  const k = H[8] || 1; // avoid divide-by-zero on degenerate input
  return H.map((n) => n / k) as Mat3;
}

/** Apply a row-major 3x3 homography to a point, returning [x, y]. */
export function projectPoint(H: Mat3, x: number, y: number): [number, number] {
  const w = H[6] * x + H[7] * y + H[8];
  return [
    (H[0] * x + H[1] * y + H[2]) / w,
    (H[3] * x + H[4] * y + H[5]) / w,
  ];
}

// Trim floating-point fuzz so identity renders as clean integers.
const fmt = (n: number): number => (Number.isFinite(n) ? Number(n.toFixed(6)) : 0);

/**
 * CSS `matrix3d(...)` (column-major) that warps an element's own box
 * (0,0)-(w,h) onto `corners`. Apply with `transform-origin: 0 0`.
 */
export function cornerPin(w: number, h: number, corners: [Pt, Pt, Pt, Pt]): string {
  const t = solveHomography(w, h, corners);
  const m = [
    t[0], t[3], 0, t[6],
    t[1], t[4], 0, t[7],
    0, 0, 1, 0,
    t[2], t[5], 0, t[8],
  ].map(fmt);
  return `matrix3d(${m.join(',')})`;
}
