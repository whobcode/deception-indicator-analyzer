/**
 * Digital signal-processing primitives.
 *
 * Replaces the previous implementation whose FFT discarded the imaginary
 * component (making every spectral feature meaningless) and whose
 * "LPC root finder" returned hard-coded constants. These are correct,
 * tested implementations.
 */

export interface Complex {
  re: number;
  im: number;
}

/** Next power of two >= n. */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Iterative in-place radix-2 Cooley–Tukey FFT.
 * Input is zero-padded to the next power of two. Returns the single-sided
 * magnitude spectrum (length = paddedLength / 2).
 */
export function fftMagnitude(input: Float32Array | number[]): Float32Array {
  const n = nextPow2(input.length || 1);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < input.length; i++) re[i] = input[i];

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }

  // Butterflies with proper complex twiddle factors.
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wpr = Math.cos(ang);
    const wpi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k;
        const b = a + (len >> 1);
        const xr = re[b] * wr - im[b] * wi;
        const xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const tmp = wr;
        wr = wr * wpr - wi * wpi;
        wi = tmp * wpi + wi * wpr;
      }
    }
  }

  const half = n >> 1;
  const mag = new Float32Array(half);
  for (let i = 0; i < half; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

/** Apply a Hann window in-place to a copy of the frame. */
export function hann(frame: Float32Array): Float32Array {
  const out = new Float32Array(frame.length);
  const N = frame.length;
  for (let i = 0; i < N; i++) {
    out[i] = frame[i] * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
  return out;
}

/**
 * Averaged (Welch-style) single-sided magnitude spectrum over overlapping
 * Hann-windowed frames. Bounded work: caps the number of frames so a long
 * upload can never blow the Worker CPU budget.
 */
export function averageSpectrum(
  signal: Float32Array,
  frameSize = 2048,
  hop = 1024,
  maxFrames = 256,
): Float32Array {
  const half = frameSize >> 1;
  const acc = new Float32Array(half);
  if (signal.length < frameSize) {
    return fftMagnitude(signal).slice(0, half);
  }
  const totalFrames = Math.floor((signal.length - frameSize) / hop) + 1;
  const stride = Math.max(1, Math.ceil(totalFrames / maxFrames));
  let frames = 0;
  for (let start = 0; start + frameSize <= signal.length; start += hop * stride) {
    const frame = hann(signal.subarray(start, start + frameSize));
    const mag = fftMagnitude(frame);
    for (let i = 0; i < half; i++) acc[i] += mag[i];
    frames++;
  }
  if (frames > 0) for (let i = 0; i < half; i++) acc[i] /= frames;
  return acc;
}

/* ------------------------------- complex math ------------------------------ */
const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const csub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
const cdiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im || 1e-12;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const cabs = (a: Complex): number => Math.hypot(a.re, a.im);

/** Evaluate a monic polynomial (coeffs highest-degree-first) at a complex x. */
function polyEval(coeffs: number[], x: Complex): Complex {
  let acc: Complex = { re: coeffs[0], im: 0 };
  for (let i = 1; i < coeffs.length; i++) {
    acc = cadd(cmul(acc, x), { re: coeffs[i], im: 0 });
  }
  return acc;
}

/**
 * Durand–Kerner (Weierstrass) iteration — finds all complex roots of a
 * polynomial given coefficients highest-degree-first. Real root finder,
 * replacing the previous stub that returned fabricated values.
 */
export function polyRoots(coeffs: number[]): Complex[] {
  // Trim leading zeros, make monic.
  let c = coeffs.slice();
  while (c.length > 1 && Math.abs(c[0]) < 1e-12) c = c.slice(1);
  const n = c.length - 1;
  if (n < 1) return [];
  c = c.map((v) => v / c[0]);

  const roots: Complex[] = [];
  const seed: Complex = { re: 0.4, im: 0.9 };
  let cur: Complex = { re: 1, im: 0 };
  for (let k = 0; k < n; k++) {
    roots.push({ ...cur });
    cur = cmul(cur, seed);
  }

  for (let iter = 0; iter < 200; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      const num = polyEval(c, roots[i]);
      let den: Complex = { re: 1, im: 0 };
      for (let j = 0; j < n; j++) {
        if (j !== i) den = cmul(den, csub(roots[i], roots[j]));
      }
      const delta = cdiv(num, den);
      roots[i] = csub(roots[i], delta);
      maxDelta = Math.max(maxDelta, cabs(delta));
    }
    if (maxDelta < 1e-10) break;
  }
  return roots;
}

/**
 * Levinson–Durbin recursion → LPC coefficients [1, a1, …, aOrder] for the
 * all-pole model A(z) = 1 + a1 z⁻¹ + … . (Fixes the previous in-place update
 * bug that corrupted coefficients mid-iteration.)
 */
export function levinson(autocorr: number[], order: number): number[] {
  const a = new Array(order + 1).fill(0);
  a[0] = 1;
  let err = autocorr[0];
  if (err === 0) return a;
  for (let i = 1; i <= order; i++) {
    let acc = autocorr[i];
    for (let j = 1; j < i; j++) acc += a[j] * autocorr[i - j];
    const k = -acc / err;
    const prev = a.slice();
    for (let j = 1; j < i; j++) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    err *= 1 - k * k;
    if (err <= 0) break;
  }
  return a;
}

export function autocorrelate(signal: Float32Array, maxLag: number): number[] {
  const R = new Array(maxLag + 1).fill(0);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = lag; i < signal.length; i++) sum += signal[i] * signal[i - lag];
    R[lag] = sum;
  }
  return R;
}

export { cabs };
