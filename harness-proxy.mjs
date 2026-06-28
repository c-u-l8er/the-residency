#!/usr/bin/env node
/* the-residency · local harness proxy
 *
 * Lets the residency run on your Claude *subscription* (the `claude` CLI harness)
 * instead of a Console `sk-ant-` API key. The page POSTs an Anthropic-shaped
 * request here; this server shells out to `claude -p` (which uses your existing
 * OAuth login) and returns an Anthropic-shaped response. No API key, no per-token
 * billing beyond your subscription.
 *
 * Run:  node the-residency/harness-proxy.mjs       (listens on http://localhost:8788)
 * Then open the residency — it auto-detects the proxy and switches to "claude harness".
 *
 * Each call is deliberately lightweight: a replaced system prompt (no coding-agent
 * persona), no MCP servers, and cwd=tmp so no project CLAUDE.md is auto-loaded.
 * Tool use (reduce_ic / web_search) is NOT supported in harness mode — those are
 * only available on the direct-API path.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import os from 'node:os';

const PORT = Number(process.env.RESIDENCY_HARNESS_PORT || 8788);
const MODEL = process.env.RESIDENCY_HARNESS_MODEL || 'claude-sonnet-4-6';
const CALL_TIMEOUT_MS = 120000;
// Each `claude -p` spawns a heavyweight worker tree (~hundreds of MB). Serialize calls
// so the host stays responsive — the residency only needs a steady trickle of posts.
const MAX_CONCURRENT = Number(process.env.RESIDENCY_HARNESS_CONCURRENCY || 1);
let active = 0; const waiters = [];
async function gate(){ if(active < MAX_CONCURRENT){ active++; return; } await new Promise(r=>waiters.push(r)); active++; }
function release(){ active--; const n = waiters.shift(); if(n) n(); }

function flatten(messages) {
  return (messages || []).map(m => {
    const c = typeof m.content === 'string'
      ? m.content
      : (m.content || []).map(b => {
          if (b.type === 'text') return b.text;
          if (b.type === 'tool_result') return '[tool result] ' + (typeof b.content === 'string' ? b.content : JSON.stringify(b.content));
          return '';
        }).join('\n');
    return `${String(m.role || 'user').toUpperCase()}: ${c}`;
  }).join('\n\n');
}

function runClaude(system, userPrompt) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--system-prompt', system || 'You are a helpful assistant. Output only the requested content.',
      '--model', MODEL,
      '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
      '--output-format', 'json',
    ];
    // Inherit the environment so `claude` uses whatever auth your logged-in CLI uses
    // (OAuth keychain/credentials file, or a CLAUDE_CODE_OAUTH_TOKEN if present).
    // => Launch this proxy from a shell where `claude -p` already works.
    const cp = spawn('claude', args, { cwd: os.tmpdir(), stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { cp.kill('SIGKILL'); reject(new Error('harness timeout')); }, CALL_TIMEOUT_MS);
    cp.stdout.on('data', d => out += d);
    cp.stderr.on('data', d => err += d);
    cp.on('error', e => { clearTimeout(timer); reject(e); });
    cp.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error('claude exit ' + code + ': ' + (err || out).slice(0, 400)));
      try { const j = JSON.parse(out); resolve(String(j.result ?? '')); }
      catch (e) { reject(new Error('bad harness json: ' + out.slice(0, 200))); }
    });
    cp.stdin.write(userPrompt || '');
    cp.stdin.end();
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, harness: 'claude', model: MODEL })); }
  if (req.method !== 'POST') { res.writeHead(405); return res.end(); }

  let body = '';
  req.on('data', d => { body += d; if (body.length > 8e6) req.destroy(); });
  req.on('end', async () => {
    await gate();
    try {
      const j = JSON.parse(body || '{}');
      const text = await runClaude(j.system, flatten(j.messages));
      const payload = {
        id: 'msg_harness', type: 'message', role: 'assistant', model: 'claude-harness',
        stop_reason: 'end_turn', content: [{ type: 'text', text }],
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ type: 'error', error: { type: 'harness_error', message: String(e && e.message || e) } }));
    } finally {
      release();
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[residency] harness proxy on http://localhost:${PORT}  (model: ${MODEL}, auth: claude subscription)`);
});
