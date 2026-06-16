/**
 * WAV decoding + acoustic feature extraction.
 *
 * Notable fixes vs. the previous version:
 *  - decodeWav floors the frame count (no more "Invalid typed array length"),
 *    supports 8/16/24-bit PCM and 32-bit float, and findChunk respects WAV
 *    word-alignment with bounds checks.
 *  - All spectral features use the corrected FFT (src/dsp.ts) over bounded,
 *    Hann-windowed frames instead of one broken FFT over the whole signal.
 *  - Formants come from real LPC root-finding (Durand–Kerner), not constants.
 *  - vibratoDuration is computed in real time units (accounts for hop size).
 */

import {
  fftMagnitude,
  averageSpectrum,
  polyRoots,
  levinson,
  autocorrelate,
} from "./dsp";

export interface DecodedAudio {
  samples: Float32Array;
  sampleRate: number;
}

export interface AudioFeatures {
  stressIndicators: { jitter: number; shimmer: number; nhr: number; stressScore: number };
  pitchAnalysis: { meanF0: number; f0Range: number; vibrato: number; vibratoDuration: number };
  pauseDetection: {
    pauseCount: number;
    meanPauseDuration: number;
    pauseFrequency: number;
    speechRate: number;
  };
  formants: { f1: number; f2: number; f3: number };
  spectralFeatures: {
    mfcc: number[];
    spectralCentroid: number;
    spectralRolloff: number;
    zcr: number;
  };
}

export interface SignalQuality {
  durationSec: number;
  peak: number;
  rms: number;
  clippingRatio: number;
  silenceRatio: number;
  analyzable: boolean;
  issues: string[];
}

export interface Timeline {
  /** Per-frame fundamental-frequency estimates (Hz), downsampled for plotting. */
  pitchContourHz: number[];
  /** Pitch points per second of audio. */
  frameRateHz: number;
}

export interface FullAnalysis {
  features: AudioFeatures;
  signalQuality: SignalQuality;
  timeline: Timeline;
}

const PITCH_FRAME = 1024;
const PITCH_HOP = 512;
const MAX_CONTOUR_POINTS = 320;

export class AudioAnalyzer {
  decodeWav(buffer: ArrayBuffer): DecodedAudio {
    const view = new DataView(buffer);
    if (view.byteLength < 12 || this.readString(view, 0, 4) !== "RIFF") {
      throw new Error("Invalid WAV file (missing RIFF header).");
    }
    if (this.readString(view, 8, 4) !== "WAVE") {
      throw new Error("Invalid WAV file (missing WAVE marker).");
    }

    const fmtOffset = this.findChunk(view, "fmt ");
    const audioFormat = view.getUint16(fmtOffset + 8, true);
    const numChannels = view.getUint16(fmtOffset + 10, true);
    const sampleRate = view.getUint32(fmtOffset + 12, true);
    const bitsPerSample = view.getUint16(fmtOffset + 22, true);

    if (numChannels < 1) throw new Error("WAV has no audio channels.");
    if (sampleRate < 1) throw new Error("WAV has an invalid sample rate.");
    if (audioFormat !== 1 && audioFormat !== 3) {
      throw new Error("Unsupported WAV format. Use PCM (1) or IEEE float (3).");
    }

    const dataOffset = this.findChunk(view, "data");
    const declaredSize = view.getUint32(dataOffset + 4, true);
    const dataStart = dataOffset + 8;
    const available = view.byteLength - dataStart;
    const dataSize = Math.min(declaredSize, Math.max(0, available));

    const bytesPerSample = bitsPerSample >> 3;
    if (bytesPerSample < 1) throw new Error("WAV has an invalid bit depth.");
    const frameCount = Math.floor(dataSize / bytesPerSample / numChannels);
    if (frameCount < 1) throw new Error("WAV contains no decodable audio frames.");

    const samples = new Float32Array(frameCount);
    for (let f = 0; f < frameCount; f++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const offset = dataStart + (f * numChannels + ch) * bytesPerSample;
        sum += this.readSample(view, offset, audioFormat, bitsPerSample);
      }
      samples[f] = sum / numChannels;
    }
    return { samples, sampleRate };
  }

  private readSample(
    view: DataView,
    offset: number,
    audioFormat: number,
    bitsPerSample: number,
  ): number {
    if (audioFormat === 1) {
      switch (bitsPerSample) {
        case 8:
          return (view.getUint8(offset) - 128) / 128; // 8-bit PCM is unsigned
        case 16:
          return view.getInt16(offset, true) / 32768;
        case 24: {
          const b0 = view.getUint8(offset);
          const b1 = view.getUint8(offset + 1);
          const b2 = view.getUint8(offset + 2);
          let v = (b2 << 16) | (b1 << 8) | b0;
          if (v & 0x800000) v |= ~0xffffff; // sign-extend
          return v / 8388608;
        }
        case 32:
          return view.getInt32(offset, true) / 2147483648;
      }
    } else if (audioFormat === 3 && bitsPerSample === 32) {
      return view.getFloat32(offset, true);
    }
    throw new Error(`Unsupported WAV sample format (format ${audioFormat}, ${bitsPerSample}-bit).`);
  }

  extractFeatures(samples: Float32Array, sampleRate: number): AudioFeatures {
    const pitchValues = this.detectPitch(samples, sampleRate);
    const spectrum = averageSpectrum(samples);
    return this.buildFeatures(samples, sampleRate, pitchValues, spectrum);
  }

  /** Full pass: features + signal quality + pitch-contour timeline (one pitch pass). */
  extractAll(samples: Float32Array, sampleRate: number): FullAnalysis {
    const pitchValues = this.detectPitch(samples, sampleRate);
    const spectrum = averageSpectrum(samples);
    return {
      features: this.buildFeatures(samples, sampleRate, pitchValues, spectrum),
      signalQuality: this.signalQuality(samples, sampleRate),
      timeline: {
        pitchContourHz: downsample(pitchValues, MAX_CONTOUR_POINTS),
        frameRateHz: sampleRate / PITCH_HOP,
      },
    };
  }

  private buildFeatures(
    samples: Float32Array,
    sampleRate: number,
    pitchValues: number[],
    spectrum: Float32Array,
  ): AudioFeatures {
    return {
      stressIndicators: this.analyzeStress(samples, pitchValues, spectrum),
      pitchAnalysis: this.analyzePitch(pitchValues, sampleRate),
      pauseDetection: this.detectPauses(samples, sampleRate),
      formants: this.extractFormants(samples, sampleRate),
      spectralFeatures: this.extractSpectralFeatures(samples, sampleRate, spectrum),
    };
  }

  /** Cheap signal-quality / suitability check over the raw samples. */
  signalQuality(samples: Float32Array, sampleRate: number): SignalQuality {
    const n = samples.length || 1;
    let peak = 0;
    let sumSq = 0;
    let clip = 0;
    let silent = 0;
    for (let i = 0; i < samples.length; i++) {
      const a = Math.abs(samples[i]);
      if (a > peak) peak = a;
      sumSq += samples[i] * samples[i];
      if (a >= 0.99) clip++;
      if (a < 0.01) silent++;
    }
    const durationSec = samples.length / sampleRate;
    const clippingRatio = clip / n;
    const silenceRatio = silent / n;
    const issues: string[] = [];
    if (durationSec < 0.5) issues.push("Clip is very short (<0.5s) — results are unreliable.");
    if (peak < 0.05) issues.push("Signal level is very low — recording may be too quiet.");
    if (clippingRatio > 0.01) issues.push("Audio is clipping (distorted peaks).");
    if (silenceRatio > 0.9) issues.push("Recording is mostly silence.");
    const analyzable = durationSec >= 0.3 && peak >= 0.02 && silenceRatio < 0.98;
    return {
      durationSec,
      peak,
      rms: Math.sqrt(sumSq / n),
      clippingRatio,
      silenceRatio,
      analyzable,
      issues,
    };
  }

  private analyzeStress(signal: Float32Array, pitchValues: number[], spectrum: Float32Array) {
    const jitter = this.calculateJitter(pitchValues);
    const shimmer = this.calculateShimmer(signal, pitchValues.length || 1);
    const nhr = this.calculateNHR(spectrum);
    const stressScore = Math.min(jitter * 0.35 + shimmer * 0.35 + nhr * 0.3, 1);
    return { jitter, shimmer, nhr, stressScore };
  }

  private analyzePitch(pitchValues: number[], sampleRate: number) {
    if (pitchValues.length === 0) {
      return { meanF0: 0, f0Range: 0, vibrato: 0, vibratoDuration: 0 };
    }
    const meanF0 = pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length;
    const f0Range = Math.max(...pitchValues) - Math.min(...pitchValues);
    const vibrato = this.detectVibrato(pitchValues, sampleRate);
    // Each pitch value spans PITCH_HOP samples → convert frame count to ms.
    const vibratoDuration = (pitchValues.length * PITCH_HOP) / sampleRate * 1000;
    return { meanF0, f0Range, vibrato, vibratoDuration };
  }

  private detectPauses(signal: Float32Array, sampleRate: number) {
    const silenceThreshold = 0.02;
    const minPauseSamples = Math.floor(sampleRate * 0.2);
    let pauseCount = 0;
    let totalPauseSamples = 0;
    let inPause = false;
    let pauseStart = 0;
    for (let i = 0; i < signal.length; i++) {
      const silent = Math.abs(signal[i]) < silenceThreshold;
      if (silent && !inPause) {
        inPause = true;
        pauseStart = i;
      } else if (!silent && inPause) {
        const len = i - pauseStart;
        if (len >= minPauseSamples) {
          pauseCount++;
          totalPauseSamples += len;
        }
        inPause = false;
      }
    }
    const totalSeconds = signal.length / sampleRate;
    const meanPauseDuration =
      pauseCount > 0 ? (totalPauseSamples / pauseCount / sampleRate) * 1000 : 0;
    const pauseFrequency = totalSeconds > 0 ? pauseCount / totalSeconds : 0;
    const speechSamples = Math.max(signal.length - totalPauseSamples, 0);
    const estimatedWords = speechSamples / (sampleRate * 0.6);
    const speechRate = totalSeconds > 0 ? (estimatedWords / totalSeconds) * 60 : 0;
    return { pauseCount, meanPauseDuration, pauseFrequency, speechRate };
  }

  private extractFormants(signal: Float32Array, sampleRate: number) {
    const order = 12;
    const R = autocorrelate(signal, order);
    if (R[0] === 0) return { f1: 0, f2: 0, f3: 0 };
    const lpc = levinson(R, order); // [1, a1, …, a12] → polynomial coeffs in z
    const roots = polyRoots(lpc);
    const formants = roots
      .filter((r) => r.im > 0 && Math.hypot(r.re, r.im) > 0.7 && Math.hypot(r.re, r.im) < 1.0)
      .map((r) => (Math.atan2(r.im, r.re) * sampleRate) / (2 * Math.PI))
      .filter((hz) => hz > 90 && hz < sampleRate / 2)
      .sort((a, b) => a - b);
    return { f1: formants[0] || 0, f2: formants[1] || 0, f3: formants[2] || 0 };
  }

  private extractSpectralFeatures(
    signal: Float32Array,
    sampleRate: number,
    spectrum: Float32Array,
  ) {
    const n = spectrum.length; // bins 0..fs/2
    const binToHz = sampleRate / 2 / n;
    const totalEnergy = spectrum.reduce((a, b) => a + b, 0) || 1;

    let centroidNum = 0;
    for (let i = 0; i < n; i++) centroidNum += spectrum[i] * (i * binToHz);
    const spectralCentroid = centroidNum / totalEnergy;

    let cumulative = 0;
    let spectralRolloff = 0;
    for (let i = 0; i < n; i++) {
      cumulative += spectrum[i];
      if (cumulative >= totalEnergy * 0.95) {
        spectralRolloff = i * binToHz;
        break;
      }
    }

    const zcr = this.zeroCrossingRate(signal, sampleRate);
    const mfcc = this.computeMFCC(spectrum, sampleRate, 13);
    return { mfcc, spectralCentroid, spectralRolloff, zcr };
  }

  private detectPitch(signal: Float32Array, sampleRate: number): number[] {
    const pitches: number[] = [];
    for (let i = 0; i + PITCH_FRAME < signal.length; i += PITCH_HOP) {
      const frame = signal.subarray(i, i + PITCH_FRAME);
      const pitch = this.autocorrelationPitch(frame, sampleRate);
      if (pitch > 0) pitches.push(pitch);
    }
    return pitches;
  }

  private autocorrelationPitch(frame: Float32Array, sampleRate: number): number {
    const minFreq = 80;
    const maxFreq = 350;
    const minLag = Math.floor(sampleRate / maxFreq);
    const maxLag = Math.floor(sampleRate / minFreq);
    let bestLag = 0;
    let bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < frame.length - lag; i++) sum += frame[i] * frame[i + lag];
      if (sum > bestCorr) {
        bestCorr = sum;
        bestLag = lag;
      }
    }
    return bestLag === 0 ? 0 : sampleRate / bestLag;
  }

  private calculateJitter(pitchValues: number[]): number {
    if (pitchValues.length < 2) return 0;
    let sumDiff = 0;
    for (let i = 1; i < pitchValues.length; i++) {
      sumDiff += Math.abs(pitchValues[i] - pitchValues[i - 1]);
    }
    const meanF0 = pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length;
    return meanF0 === 0 ? 0 : sumDiff / pitchValues.length / meanF0;
  }

  private calculateShimmer(signal: Float32Array, segments: number): number {
    const windowSize = Math.max(1, Math.floor(signal.length / segments));
    let sumDiff = 0;
    let count = 0;
    let prevAmp = 0;
    for (let i = 0; i < signal.length; i += windowSize) {
      const slice = signal.subarray(i, i + windowSize);
      let amp = 0;
      for (let j = 0; j < slice.length; j++) amp = Math.max(amp, Math.abs(slice[j]));
      if (count > 0) sumDiff += Math.abs(amp - prevAmp);
      prevAmp = amp;
      count++;
    }
    let meanAmp = 0;
    for (let i = 0; i < signal.length; i++) meanAmp = Math.max(meanAmp, Math.abs(signal[i]));
    return sumDiff / Math.max(count - 1, 1) / (meanAmp || 1);
  }

  /** Crude noise-to-harmonic proxy from a correct magnitude spectrum. */
  private calculateNHR(spectrum: Float32Array): number {
    const len = spectrum.length;
    let harmonic = 0;
    let noise = 0;
    const lowEnd = Math.floor(len * 0.3);
    const highStart = Math.floor(len * 0.7);
    for (let i = 0; i < lowEnd; i++) harmonic += spectrum[i];
    for (let i = highStart; i < len; i++) noise += spectrum[i];
    return noise / (harmonic + noise + 1e-9);
  }

  private detectVibrato(pitchValues: number[], sampleRate: number): number {
    if (pitchValues.length < 8) return 0;
    // Pitch contour is sampled once per hop → its effective rate.
    const contourRate = sampleRate / PITCH_HOP;
    const mag = fftMagnitude(Float32Array.from(pitchValues));
    const start = 1;
    const end = mag.length;
    let maxVal = 0;
    let maxIdx = start;
    for (let i = start; i < end; i++) {
      if (mag[i] > maxVal) {
        maxVal = mag[i];
        maxIdx = i;
      }
    }
    // Map the dominant modulation bin to Hz (vibrato is typically 4–8 Hz).
    return (maxIdx / (mag.length * 2)) * contourRate;
  }

  private zeroCrossingRate(signal: Float32Array, sampleRate: number): number {
    let crossings = 0;
    for (let i = 1; i < signal.length; i++) {
      if (
        (signal[i] >= 0 && signal[i - 1] < 0) ||
        (signal[i] < 0 && signal[i - 1] >= 0)
      ) {
        crossings++;
      }
    }
    return signal.length > 0 ? (crossings / signal.length) * sampleRate : 0;
  }

  private computeMFCC(magnitude: Float32Array, sampleRate: number, count: number): number[] {
    const melCount = 26;
    const melEnergies = new Array(melCount).fill(0);
    const mel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
    const invMel = (m: number) => 700 * (10 ** (m / 2595) - 1);
    const maxMel = mel(sampleRate / 2);
    const melPoints = new Array(melCount + 2)
      .fill(0)
      .map((_, i) => invMel(((i / (melCount + 1)) * maxMel)));
    const bin = melPoints.map((hz) =>
      Math.min(magnitude.length - 1, Math.floor((hz / (sampleRate / 2)) * magnitude.length)),
    );
    for (let m = 1; m <= melCount; m++) {
      const left = bin[m - 1];
      const center = bin[m];
      const right = bin[m + 1];
      for (let i = left; i < center; i++) {
        const w = (i - left) / Math.max(center - left, 1);
        melEnergies[m - 1] += (magnitude[i] || 0) * w;
      }
      for (let i = center; i < right; i++) {
        const w = (right - i) / Math.max(right - center, 1);
        melEnergies[m - 1] += (magnitude[i] || 0) * w;
      }
    }
    const logEnergies = melEnergies.map((e) => Math.log(e + 1e-9));
    const mfcc = new Array(count).fill(0);
    for (let k = 0; k < count; k++) {
      let sum = 0;
      for (let nn = 0; nn < logEnergies.length; nn++) {
        sum += logEnergies[nn] * Math.cos((Math.PI * k * (nn + 0.5)) / logEnergies.length);
      }
      mfcc[k] = sum;
    }
    return mfcc;
  }

  private readString(view: DataView, offset: number, length: number): string {
    let out = "";
    for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i));
    return out;
  }

  /** Walk RIFF chunks honouring word-alignment (odd-sized chunks have a pad byte). */
  private findChunk(view: DataView, chunkId: string): number {
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const id = this.readString(view, offset, 4);
      const size = view.getUint32(offset + 4, true);
      if (id === chunkId) return offset;
      offset += 8 + size + (size & 1); // pad to even boundary
    }
    throw new Error(`WAV chunk not found: ${chunkId}`);
  }
}

/** Downsample an array to at most `max` points by block averaging (for plotting). */
function downsample(arr: number[], max: number): number[] {
  if (arr.length <= max) return arr.map((v) => Math.round(v * 10) / 10);
  const out: number[] = [];
  const block = arr.length / max;
  for (let i = 0; i < max; i++) {
    const start = Math.floor(i * block);
    const end = Math.floor((i + 1) * block);
    let sum = 0;
    for (let j = start; j < end; j++) sum += arr[j];
    out.push(Math.round((sum / Math.max(end - start, 1)) * 10) / 10);
  }
  return out;
}
