/** Shared analysis pipeline used by both the REST endpoint and the MCP tool. */

import { AudioAnalyzer, type AudioFeatures } from "./audio-analyzer";
import {
  calculateDeceptionFactors,
  computeDeceptionScore,
  generateExplanation,
  getRiskLevel,
  normalizeEmotion,
  DISCLAIMER,
  type DeceptionFactors,
} from "./deception";
import { callHuggingFace, callHFText } from "./hf";
import { EMOTION_MODEL, TRANSCRIPTION_MODEL, type Env } from "./types";

const analyzer = new AudioAnalyzer();

export interface AnalysisResult {
  audioFeatures: AudioFeatures;
  emotionalState: Record<string, number>;
  dominantEmotion: string;
  deceptionScore: number;
  deceptionFactors: DeceptionFactors;
  riskLevel: "low" | "medium" | "high";
  explanation: string;
  transcription?: string;
  warnings?: string[];
  disclaimer: string;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64.replace(/^data:[^,]*,/, "")); // tolerate data: URLs
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Run the full pipeline. Local DSP always runs; the two HuggingFace calls are
 * best-effort and run in parallel — if they fail, analysis still succeeds with
 * a warning rather than erroring the whole request.
 */
export async function runAnalysis(buffer: ArrayBuffer, env: Env): Promise<AnalysisResult> {
  const { samples, sampleRate } = analyzer.decodeWav(buffer);
  const audioFeatures = analyzer.extractFeatures(samples, sampleRate);

  const warnings: string[] = [];
  let emotionRaw: unknown = null;
  let transcriptionText: string | undefined;

  // 1) Transcribe the audio (whisper).
  try {
    const audioBytes = new Uint8Array(buffer);
    const transcriptionRaw = await callHuggingFace(env, TRANSCRIPTION_MODEL, audioBytes);
    if (transcriptionRaw && typeof (transcriptionRaw as { text?: unknown }).text === "string") {
      transcriptionText = (transcriptionRaw as { text: string }).text.trim() || undefined;
    }
  } catch (err) {
    warnings.push(`Transcription unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2) Derive emotion from the transcript text (audio-emotion models aren't on
  //    HF serverless inference; text-emotion models are).
  if (transcriptionText) {
    try {
      emotionRaw = await callHFText(env, EMOTION_MODEL, transcriptionText);
    } catch (err) {
      warnings.push(`Emotion unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    warnings.push("Emotion skipped: no speech transcribed.");
  }

  const { emotionScores, dominantEmotion } = normalizeEmotion(emotionRaw);
  const deceptionFactors = calculateDeceptionFactors(audioFeatures);
  const deceptionScore = computeDeceptionScore(deceptionFactors);

  return {
    audioFeatures,
    emotionalState: emotionScores,
    dominantEmotion,
    deceptionScore,
    deceptionFactors,
    riskLevel: getRiskLevel(deceptionScore),
    explanation: generateExplanation(deceptionScore, deceptionFactors, audioFeatures),
    transcription: transcriptionText,
    warnings: warnings.length ? warnings : undefined,
    disclaimer: DISCLAIMER,
  };
}
