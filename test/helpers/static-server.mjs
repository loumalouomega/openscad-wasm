// Minimal static file server (serves the repo root) shared by the browser test
// and `npm run example:browser`. Sends application/wasm so streaming works.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm", ".json": "application/json" };

export function serve(port = 0) {
  return createServer((req, res) => {
    const p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
  }).listen(port);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = serve(Number(process.env.PORT ?? 8080));
  server.on("listening", () =>
    console.log(`open http://127.0.0.1:${server.address().port}/examples/browser/index.html`));
}
