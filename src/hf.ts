/**
 * HuggingFace inference, with env validation and a bounded timeout. Callers
 * should treat failures as non-fatal (graceful degradation) — see analysis.ts.
 *
 * Routing note: HuggingFace retired the old `api-inference.huggingface.co`
 * serverless API (it no longer resolves), which is what Cloudflare AI Gateway's
 * `huggingface` provider proxies to — so gateway calls return 530/Origin-DNS.
 * We therefore call HF's current **Inference Providers** router directly. The
 * authenticated `skygate` gateway is wired and ready (USE_GATEWAY=true) for
 * when Cloudflare updates their HF provider, or for other providers.
 */

import type { Env } from "./types";

export class HFConfigError extends Error {}

/** Flip to true to route through the authenticated skygate gateway instead. */
const USE_GATEWAY = false;

export function assertHFConfig(env: Env): void {
  const missing: string[] = [];
  if (!env.HF_API_TOKEN) missing.push("HF_API_TOKEN");
  if (USE_GATEWAY) {
    if (!env.ACCOUNT_ID) missing.push("ACCOUNT_ID");
    if (!env.GATEWAY_ID) missing.push("GATEWAY_ID");
    if (!env.CF_AIG_TOKEN) missing.push("CF_AIG_TOKEN");
  }
  if (missing.length) {
    throw new HFConfigError(`Missing required configuration: ${missing.join(", ")}`);
  }
}

function endpoint(env: Env, model: string): string {
  return USE_GATEWAY
    ? `https://gateway.ai.cloudflare.com/v1/${env.ACCOUNT_ID}/${env.GATEWAY_ID}/huggingface/${model}`
    : `https://router.huggingface.co/hf-inference/models/${model}`;
}

/**
 * POST raw audio bytes to a HuggingFace audio model (ASR / audio-classification).
 * Sends the bytes directly (no base64 bloat) with an audio/* content type.
 */
export async function callHuggingFace(
  env: Env,
  model: string,
  audio: Uint8Array,
  timeoutMs = 25000,
): Promise<unknown> {
  assertHFConfig(env);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.HF_API_TOKEN}`,
    "Content-Type": "audio/wav",
  };
  if (USE_GATEWAY) headers["cf-aig-authorization"] = `Bearer ${env.CF_AIG_TOKEN}`;

  return post(endpoint(env, model), headers, audio, timeoutMs);
}

/** Call a HuggingFace text model (e.g. text-classification) with a JSON body. */
export async function callHFText(
  env: Env,
  model: string,
  text: string,
  timeoutMs = 20000,
): Promise<unknown> {
  assertHFConfig(env);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.HF_API_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (USE_GATEWAY) headers["cf-aig-authorization"] = `Bearer ${env.CF_AIG_TOKEN}`;
  return post(endpoint(env, model), headers, JSON.stringify({ inputs: text }), timeoutMs);
}

async function post(
  url: string,
  headers: Record<string, string>,
  body: BodyInit,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `HuggingFace error: ${response.status} ${response.statusText} ${detail}`.trim().slice(0, 300),
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
