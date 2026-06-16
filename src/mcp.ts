/**
 * Minimal MCP (Model Context Protocol) server over JSON-RPC 2.0, served at
 * POST /mcp. Implements: initialize, notifications/initialized, ping,
 * tools/list, tools/call. Exposes one tool: analyze_audio.
 *
 * Transport: simple HTTP request/response (each POST is one JSON-RPC message).
 */

import { fromBase64, runAnalysis } from "./analysis";
import type { Env } from "./types";
import { MAX_AUDIO_BYTES } from "./types";

const PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const TOOLS = [
  {
    name: "analyze_audio",
    description:
      "Analyze a WAV audio clip for acoustic stress/deception indicators and " +
      "(if configured) emotion + transcription. Returns feature metrics and a " +
      "heuristic, non-validated deception score.",
    inputSchema: {
      type: "object",
      properties: {
        audio_base64: {
          type: "string",
          description: "Base64-encoded WAV file (PCM 8/16/24-bit or 32-bit float).",
        },
      },
      required: ["audio_base64"],
    },
  },
];

function ok(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}
function err(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function dispatch(req: JsonRpcRequest, env: Env): Promise<object | null> {
  switch (req.method) {
    case "initialize":
      return ok(req.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "deception-analyzer", version: "2.0.0" },
      });
    case "notifications/initialized":
      return null; // notification — no response
    case "ping":
      return ok(req.id, {});
    case "tools/list":
      return ok(req.id, { tools: TOOLS });
    case "tools/call": {
      const params = req.params ?? {};
      const name = params.name as string;
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      if (name !== "analyze_audio") {
        return err(req.id, -32602, `Unknown tool: ${name}`);
      }
      const b64 = args.audio_base64;
      if (typeof b64 !== "string" || b64.length === 0) {
        return err(req.id, -32602, "audio_base64 (string) is required");
      }
      try {
        const bytes = fromBase64(b64);
        if (bytes.byteLength > MAX_AUDIO_BYTES) {
          return err(req.id, -32602, `Audio exceeds ${MAX_AUDIO_BYTES} bytes`);
        }
        const result = await runAnalysis(bytes.buffer as ArrayBuffer, env);
        return ok(req.id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      } catch (e) {
        return ok(req.id, {
          isError: true,
          content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
        });
      }
    }
    default:
      return err(req.id, -32601, `Method not found: ${req.method}`);
  }
}

/** Handle a POST /mcp body (single JSON-RPC message or a batch). */
export async function handleMcp(request: Request, env: Env): Promise<unknown> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err(null, -32700, "Parse error");
  }
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => dispatch(m as JsonRpcRequest, env)))).filter(
      (r) => r !== null,
    );
    return responses;
  }
  return await dispatch(body as JsonRpcRequest, env);
}

export { TOOLS };
