# deception-analyzer-worker

Cloudflare Worker that analyzes a WAV clip for acoustic stress indicators and
(optionally) emotion + transcription via the Cloudflare AI Gateway → HuggingFace.

> ⚠️ **Disclaimer:** acoustic / voice-stress "deception detection" is **not**
> a scientifically validated method of lie detection. The deception score is a
> heuristic over signal features and must **not** be used as evidence or to make
> decisions about people.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analyze` | multipart form, field `audio` (WAV) → analysis JSON |
| POST | `/mcp` | MCP JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`) |
| GET | `/health` | liveness |
| GET | `/mcp/health` `/mcp/status` `/mcp/config` | legacy info (back-compat) |

### MCP

Implements the Model Context Protocol over JSON-RPC at `POST /mcp`. One tool:

- **`analyze_audio`** — input `{ "audio_base64": "<base64 WAV>" }`.

```bash
curl -s https://voice.hwmnbn.me/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Configuration

| Name | Kind | Purpose |
|------|------|---------|
| `HF_API_TOKEN` | **secret** | HuggingFace token — `wrangler secret put HF_API_TOKEN` |
| `CF_AIG_TOKEN` | **secret** | AI Gateway "Run" token for authenticated `skygate` (only used when `USE_GATEWAY=true` in `src/hf.ts`) |
| `ACCOUNT_ID` | var | Cloudflare account id (gateway URL, when `USE_GATEWAY`) |
| `GATEWAY_ID` | var | AI Gateway name `skygate` (when `USE_GATEWAY`) |

AI calls are best-effort: if HuggingFace is unavailable, analysis still returns
the local acoustic features with a `warnings` entry.

### AI routing

HuggingFace retired the old `api-inference.huggingface.co` serverless API (which
Cloudflare AI Gateway's `huggingface` provider proxies to → `530 Origin DNS`), so
this Worker calls HF's current **Inference Providers** router
(`router.huggingface.co/hf-inference`) directly. The authenticated `skygate`
gateway is wired and ready behind `USE_GATEWAY` in `src/hf.ts`.

Models (both on the `hf-inference` provider):
- Transcription: `openai/whisper-large-v3-turbo` (audio → text)
- Emotion: `j-hartmann/emotion-english-distilroberta-base` (transcript → emotion)

Audio-emotion models aren't hosted on HF serverless inference, so emotion is
derived from the transcript text.

## Develop

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # DSP correctness tests (FFT, LPC root-finding)
npm run dev         # wrangler dev
npm run deploy      # wrangler deploy
```

Deploys automatically from `main` via GitHub Actions
(`.github/workflows/deploy.yml`), gated on the `CLOUDFLARE_API_TOKEN` secret.

## What changed in 2.0

- Correct iterative complex **FFT** (the previous one discarded the imaginary
  component, making every spectral feature meaningless).
- Real **LPC formant** estimation via Durand–Kerner root-finding (previously
  hard-coded constants).
- WAV decoder: floors frame count, supports 8/16/24-bit PCM + 32-bit float,
  word-aligned RIFF chunk parsing with bounds checks.
- Bounded, windowed STFT so large uploads can't exhaust the CPU budget.
- Hardening: upload size limits, CORS, env validation, parallel AI calls with
  graceful degradation, `HF_API_TOKEN` moved from a plain var to a secret.
- Real MCP JSON-RPC server with an `analyze_audio` tool.
- 404 catch-all (unmatched routes previously crashed the Worker).
