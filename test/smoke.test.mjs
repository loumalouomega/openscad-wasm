// Smoke test: .scad fixtures -> .csg through the WASM build, diffed against
// the binary-path oracle (local `openscad` on PATH — 2021.01 in CI here).
// Mirrors CAD-Preview probe items 3 (correctness) and 7 (timing).
//
// Usage: CAD_PREVIEW_DIR=/home/vicente/src/CAD-Preview node --test test/smoke.test.mjs
// Requires dist/ (npm run build first). Skips with a clear message otherwise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const DIST_MJS = join(ROOT, "dist", "openscad.mjs");
const FIXDIR = join(
  process.env.CAD_PREVIEW_DIR ?? "/home/vicente/src/CAD-Preview",
  "examples/OpenSCAD",
);

const CASES = ["minimal", "parametric", "include-main", "colour-booleans"];

function binaryCsg(name) {
  // Binary path: cwd=source dir (relative include resolution), -o selects
  // the exporter by extension — same contract as scadService.ts.
  const dir = mkdtempSync(join(tmpdir(), "scad-oracle-"));
  const src = readFileSync(join(FIXDIR, `${name}.scad`), "utf8");
  writeFileSync(join(dir, `${name}.scad`), src);
  if (name === "include-main") {
    writeFileSync(join(dir, "include-lib.scad"), readFileSync(join(FIXDIR, "include-lib.scad"), "utf8"));
  }
  execFileSync("openscad", [`${name}.scad`, "-o", "oracle.csg"], { cwd: dir, timeout: 120000 });
  return readFileSync(join(dir, "oracle.csg"), "utf8");
}

for (const name of CASES) {
  test(`${name}.scad -> .csg matches binary oracle`, async () => {
    if (!existsSync(DIST_MJS)) {
      console.log("SKIP: dist/ not built yet (npm run build first)");
      return;
    }
    const { renderToCsg } = await import(DIST_MJS);
    const scad = readFileSync(join(FIXDIR, `${name}.scad`), "utf8");
    const extraFiles = {};
    let source = scad;
    if (name === "include-main") {
      // Stage both files under MEMFS root so the relative include resolves
      // the way cwd=source-dir does on the binary path.
      extraFiles["/i.scad"] = readFileSync(join(FIXDIR, "include-lib.scad"), "utf8");
      source = scad.replace("include-lib.scad", "i.scad");
    }
    const t0 = Date.now();
    const csg = await renderToCsg(source, { extraFiles });
    const ms = Date.now() - t0;
    const oracle = binaryCsg(name);
    console.log(`${name}: wasm ${ms}ms, ${csg.length} bytes (oracle ${oracle.length})`);
    assert.equal(csg, oracle);
  });
}

test("parametric -D override applies", async () => {
  if (!existsSync(DIST_MJS)) {
    console.log("SKIP: dist/ not built yet (npm run build first)");
    return;
  }
  const { renderToCsg } = await import(DIST_MJS);
  const scad = readFileSync(join(FIXDIR, "parametric.scad"), "utf8");
  const base = await renderToCsg(scad, {});
  const wide = await renderToCsg(scad, { defines: { width: 60 } });
  assert.notEqual(base, wide);
});
