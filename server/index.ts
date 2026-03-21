/**
 * WellFlow Custom Server — port 4000
 *
 * Boots Next.js (frontend + all /api/raw/* routes) and attaches
 * the RAW WebSocket server on the same HTTP server — everything on port 4000.
 *
 * Usage:
 *   npm run server        (dev, via ts-node)
 *   npm run server:start  (prod, after build)
 */

import http from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

// ─── Load .env.local ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const dev  = process.env.NODE_ENV !== 'production';

// ─── Boot Next.js ────────────────────────────────────────────────────────────
const app     = next({ dev, hostname: 'localhost', port: PORT });
const handle  = app.getRequestHandler();

app.prepare().then(() => {
  // ─── HTTP server (Next.js handles everything) ──────────────────────────────
  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // ─── WebSocket server for Murf TTS streaming ──────────────────────────────
  const wss = new WebSocketServer({ server, path: '/ws/murf/tts' });

  function getMurfKey(): string {
    const k = process.env.MURF_API_KEY;
    if (!k?.trim()) throw new Error('MURF_API_KEY missing — set it in .env.local');
    return k;
  }

  wss.on('connection', (ws, req) => {
    const { searchParams } = new URL(req.url!, `http://localhost`);
    const sessionId = searchParams.get('sessionId') ?? 'unknown';
    console.log(`[RAW:ws] Connected session=${sessionId}`);

    let murfWs: WebSocket | null = null;

    function connectMurf() {
      try {
        murfWs = new WebSocket('wss://api.murf.ai/v1/speech/stream', {
          headers: { Authorization: `Bearer ${getMurfKey()}` },
        });
        murfWs.on('message', (data) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(data);
        });
        murfWs.on('error', (err) => {
          console.error(`[RAW:ws] Murf error: ${err.message}`);
          ws.send(JSON.stringify({ error: err.message }));
        });
        murfWs.on('close', () => console.log(`[RAW:ws] Murf closed session=${sessionId}`));
      } catch (err: any) {
        ws.send(JSON.stringify({ error: err.message }));
      }
    }

    connectMurf();

    ws.on('message', (data) => {
      if (murfWs?.readyState === WebSocket.OPEN) murfWs.send(data);
    });

    ws.on('close', () => {
      console.log(`[RAW:ws] Client disconnected session=${sessionId}`);
      murfWs?.close();
    });
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  server.listen(PORT, () => {
    console.log(`\n┌──────────────────────────────────────────────┐`);
    console.log(`│   WellFlow RAW — Unified Server              │`);
    console.log(`├──────────────────────────────────────────────┤`);
    console.log(`│   Frontend  →  http://localhost:${PORT}          │`);
    console.log(`│   API       →  http://localhost:${PORT}/api/raw/ │`);
    console.log(`│   WebSocket →  ws://localhost:${PORT}/ws/murf/tts│`);
    console.log(`│   Mode      →  ${dev ? 'development' : 'production    '}                │`);
    console.log(`└──────────────────────────────────────────────┘\n`);
  });
});
