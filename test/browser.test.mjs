// Headless-Chromium test of the browser entry. Needs dist/ and Playwright
// (CI installs it; skipped locally when either is missing).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, serve } from "./helpers/static-server.mjs";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  /* not installed */
}
const skip = !chromium ? "playwright not installed" : !existsSync(join(ROOT, "dist", "openscad.mjs")) ? "dist/ not built" : false;

test("browser: render a model to STL", { skip }, async () => {
  const server = serve(0);
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
