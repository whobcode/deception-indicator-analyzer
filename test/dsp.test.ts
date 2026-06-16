/**
 * Correctness tests for the two headline bug fixes:
 *  - fftMagnitude must put a pure tone's energy in the right bin (the old FFT
 *    discarded the imaginary part and produced garbage).
 *  - polyRoots must actually find polynomial roots (the old code returned
 *    fabricated constants).
 *
 * Run: npm test   (uses tsx)
 */
import { fftMagnitude, polyRoots, levinson, autocorrelate } from "../src/dsp";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

// 1) FFT of a pure sine → peak at the expected bin.
{
  const N = 1024;
  const fs = 8000;
  const freq = 500; // Hz
  const sig = new Float32Array(N);
  for (let i = 0; i < N; i++) sig[i] = Math.sin((2 * Math.PI * freq * i) / fs);
  const mag = fftMagnitude(sig);
  let peak = 0;
  for (let i = 1; i < mag.length; i++) if (mag[i] > mag[peak]) peak = i;
  const peakHz = (peak / (mag.length * 2)) * fs;
  check("FFT peak near 500Hz", Math.abs(peakHz - freq) < fs / N, `got ${peakHz.toFixed(1)}Hz`);
  // DC of a zero-mean sine should be small relative to the peak.
  check("FFT DC small for sine", mag[0] < mag[peak] * 0.1, `dc=${mag[0].toFixed(2)} peak=${mag[peak].toFixed(2)}`);
}

// 2) polyRoots of (x-2)(x-3) = x^2 - 5x + 6 → {2,3}.
{
  const roots = polyRoots([1, -5, 6]).map((r) => r.re).sort((a, b) => a - b);
  check("polyRoots finds 2 and 3", Math.abs(roots[0] - 2) < 1e-6 && Math.abs(roots[1] - 3) < 1e-6, `got ${roots.map((x) => x.toFixed(4)).join(",")}`);
}

// 3) Levinson on a simple resonant signal yields a stable polynomial whose
//    roots fall inside the unit circle (sanity, not exactness).
{
  const fs = 8000;
  const N = 2000;
  const sig = new Float32Array(N);
  for (let i = 0; i < N; i++) sig[i] = Math.sin((2 * Math.PI * 700 * i) / fs) * Math.exp(-i / 4000);
  const R = autocorrelate(sig, 12);
  const lpc = levinson(R, 12);
  check("levinson returns order+1 coeffs", lpc.length === 13);
  const roots = polyRoots(lpc);
  const maxMag = Math.max(...roots.map((r) => Math.hypot(r.re, r.im)));
  check("LPC roots inside unit circle", maxMag < 1.0001, `maxMag=${maxMag.toFixed(4)}`);
}

if (failures) {
  throw new Error(`${failures} DSP test(s) failed`);
}
console.log("\nAll DSP tests passed");
