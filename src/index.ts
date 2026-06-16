/**
 * deception-analyzer-worker — entrypoint.
 *
 *  POST /api/analyze        multipart form, field "audio" (WAV) → analysis JSON
 *  POST /mcp                MCP JSON-RPC 2.0 (initialize/tools.list/tools.call)
 *  GET  /health             liveness
 *  GET  /mcp/health|status|config   legacy info endpoints (back-compat)
 *  *                        404
 */

import { AutoRouter, type IRequest } from "itty-router";
import { runAnalysis } from "./analysis";
import { handleMcp, TOOLS } from "./mcp";
import { MAX_AUDIO_BYTES, type Env } from "./types";
import { DISCLAIMER } from "./deception";
import UI_HTML from "./ui.html";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

const router = AutoRouter<IRequest, [Env, ExecutionContext]>({
  // AutoRouter adds JSON formatting + a 404; we still set CORS via finally/catch.
  missing: () => json({ error: "Not found" }, 404),
});

router.options("*", () => new Response(null, { status: 204, headers: CORS }));

// Web UI.
router.get("/", () => new Response(UI_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }));

router.post("/api/analyze", async (request, env: Env) => {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength && contentLength > MAX_AUDIO_BYTES + 4096) {
      return json({ error: `Upload too large (max ${MAX_AUDIO_BYTES} bytes).` }, 413);
    }
    const formData = await request.formData();
    const entry = formData.get("audio") as unknown;
    const audioFile = entry as { size: number; arrayBuffer(): Promise<ArrayBuffer> } | null;
    if (!audioFile || typeof entry === "string" || typeof audioFile.arrayBuffer !== "function") {
      return json({ error: "No audio file provided (form field 'audio')." }, 400);
    }
    if (typeof audioFile.size === "number" && audioFile.size > MAX_AUDIO_BYTES) {
      return json({ error: `Audio too large (max ${MAX_AUDIO_BYTES} bytes).` }, 413);
    }
    const arrayBuffer = await audioFile.arrayBuffer();
    const analysis = await runAnalysis(arrayBuffer, env);
    return json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return json({ error: message }, 500);
  }
});

router.post("/mcp", async (request, env: Env) => {
  const result = await handleMcp(request as unknown as Request, env);
  if (result === null) return new Response(null, { status: 204, headers: CORS });
  return json(result);
});

router.get("/health", () => json({ status: "ok", service: "deception-analyzer", disclaimer: DISCLAIMER }));

// Legacy info endpoints (kept for back-compat with existing /mcp/* callers).
router.get("/mcp/health", () =>
  json({ status: "MCP server operational", protocol: "json-rpc-2.0 at POST /mcp", timestamp: new Date().toISOString() }),
);
router.get("/mcp/status", () => json({ status: "ok", tools: TOOLS.map((t) => t.name), timestamp: new Date().toISOString() }));
router.get("/mcp/config", () => json({ protocolVersion: "2024-11-05", tools: TOOLS }));

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
    const res = (await router.fetch(request, env, ctx)) as Response;
    // Ensure CORS headers on every response (incl. AutoRouter-formatted ones).
    for (const [k, v] of Object.entries(CORS)) {
      if (!res.headers.has(k)) res.headers.set(k, v);
    }
    return res;
  },
};
