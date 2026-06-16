/**
 * Deception scoring + emotion normalisation.
 *
 * NOTE: voice-stress / acoustic "deception detection" is NOT a scientifically
 * validated method of lie detection. These scores are heuristic signal
 * features only and must not be used to make real decisions about people.
 */

import type { AudioFeatures } from "./audio-analyzer";

export interface DeceptionFactors {
  stressLevel: number;
  hesitationPattern: number;
  pitchVariation: number;
  speechRate: number;
  pauseFrequency: number;
  formantVariability: number;
}

export interface EmotionResult {
  emotionScores: Record<string, number>;
  dominantEmotion: string;
}

export const DISCLAIMER =
  "Acoustic deception scoring is heuristic and NOT scientifically validated. " +
  "Do not use it as evidence or to make decisions about individuals.";

export function normalizeEmotion(raw: unknown): EmotionResult {
  const scores: Record<string, number> = {};
  let dominantEmotion = "neutral";
  let maxScore = 0;
  // Text-classification returns [[{label,score}…]]; audio returns [{label,score}…].
  let arr: unknown = raw;
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) arr = raw[0];
  if (Array.isArray(arr)) {
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const label = (item as { label?: unknown }).label;
      const score = (item as { score?: unknown }).score;
      if (typeof label === "string" && typeof score === "number") {
        scores[label] = score;
        if (score > maxScore) {
          maxScore = score;
          dominantEmotion = label;
        }
      }
    }
  }
  return { emotionScores: scores, dominantEmotion };
}

export function calculateDeceptionFactors(f: AudioFeatures): DeceptionFactors {
  return {
    stressLevel: f.stressIndicators.stressScore,
    hesitationPattern: Math.min(f.pauseDetection.pauseFrequency * 0.5, 1),
    pitchVariation: Math.min(f.pitchAnalysis.f0Range / 200, 1),
    speechRate: Math.min(Math.abs(f.pauseDetection.speechRate - 150) / 150, 1),
    pauseFrequency: Math.min(f.pauseDetection.pauseFrequency * 2, 1),
    formantVariability: Math.min(
      (Math.abs(f.formants.f1 - 700) + Math.abs(f.formants.f2 - 1200)) / 2000,
      1,
    ),
  };
}

const WEIGHTS: Record<keyof DeceptionFactors, number> = {
  stressLevel: 0.25,
  hesitationPattern: 0.2,
  pitchVariation: 0.15,
  speechRate: 0.15,
  pauseFrequency: 0.15,
  formantVariability: 0.1,
};

export function computeDeceptionScore(factors: DeceptionFactors): number {
  let score = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof DeceptionFactors)[]) {
    score += factors[key] * WEIGHTS[key];
  }
  return Math.min(Math.max(score, 0), 1);
}

export function getRiskLevel(score: number): "low" | "medium" | "high" {
  if (score < 0.33) return "low";
  if (score < 0.67) return "medium";
  return "high";
}

export function generateExplanation(
  score: number,
  factors: DeceptionFactors,
  features: AudioFeatures,
): string {
  const parts: string[] = [];
  if (factors.stressLevel > 0.6) {
    parts.push(
      `High vocal stress detected (jitter ${(features.stressIndicators.jitter * 100).toFixed(1)}%, ` +
        `shimmer ${(features.stressIndicators.shimmer * 100).toFixed(1)}%).`,
    );
  }
  if (factors.pauseFrequency > 0.6) {
    parts.push(
      `Frequent pauses (${features.pauseDetection.pauseCount} pauses, ` +
        `avg ${features.pauseDetection.meanPauseDuration.toFixed(0)}ms).`,
    );
  }
  if (factors.pitchVariation > 0.6) {
    parts.push(`Significant pitch variation (range ${features.pitchAnalysis.f0Range.toFixed(0)}Hz).`);
  }
  if (score > 0.65) parts.push("Multiple indicators present — high suspicion.");
  else if (score > 0.4) parts.push("Some indicators present — moderate suspicion.");
  else parts.push("Minimal indicators detected — low suspicion.");
  return parts.join(" ");
}
