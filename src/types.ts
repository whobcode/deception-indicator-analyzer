export interface Env {
  /** Cloudflare account id used to build the AI Gateway URL. */
  ACCOUNT_ID?: string;
  /** AI Gateway id/name (e.g. "skygate"). */
  GATEWAY_ID?: string;
  /** HuggingFace API token — stored as a Worker SECRET, never a plain var. */
  HF_API_TOKEN?: string;
  /**
   * Cloudflare AI Gateway "Run" token for the authenticated `skygate` gateway,
   * sent as the `cf-aig-authorization` header. Stored as a Worker SECRET.
   */
  CF_AIG_TOKEN?: string;
}

/** Largest audio upload we will decode (protects the Worker CPU/memory budget). */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

// HF's serverless `hf-inference` provider no longer hosts audio-emotion models,
// so we transcribe the audio and classify emotion from the transcript text.
export const TRANSCRIPTION_MODEL = "openai/whisper-large-v3-turbo"; // audio → text
export const EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"; // text → emotion
