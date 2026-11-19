#!/usr/bin/env node
// Tiny static server for the skill lab. `node lab/serve.mjs [port]` → http://localhost:4173/
// Serves lab/ as the web root (so /responsive/r01-hero/ and /l10n/l01-marketing/fr/ work). Directories serve index.html.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || process.env.LAB_PORT || 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".webm": "video/webm",
  ".mp4": "video/mp4", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(ROOT, p);
    if (!file.startsWith(ROOT)) throw new Error("outside root");
    const s = await stat(file).catch(() => null);
    if (s?.isDirectory()) {
      if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" }); return res.end(); }
      file = path.join(file, "index.html");
    }
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
}).listen(PORT, () => console.log(`lab on http://localhost:${PORT}/`));
