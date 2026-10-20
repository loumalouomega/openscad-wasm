// Headless-Chromium test of the browser entry. Needs dist/ and Playwright
// (CI installs it; skipped locally when either is missing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".wasm": "application/wasm" };

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  /* not installed */
}
const skip = !chromium ? "playwright not installed" : !existsSync(join(ROOT, "dist", "openscad.mjs")) ? "dist/ not built" : false;

test("browser: render a model to STL", { skip }, async () => {
  const server = createServer((req, res) => {
    const p = normalize(join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!p.startsWith(ROOT) || !existsSync(p)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" }).end(readFileSync(p));
  }).listen(0);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/examples/browser/index.html`);
    await page.waitForFunction(() => window.__done, null, { timeout: 120000 });
    const done = await page.evaluate(() => window.__done);
    assert.deepEqual(errors, []);
    assert.equal(done.error, undefined);
    assert.ok(done.tris > 12);
  } finally {
    await browser.close();
    server.close();
  }
});
