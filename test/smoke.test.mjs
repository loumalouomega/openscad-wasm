// Smoke test: .scad fixtures -> .csg through the WASM build.
//
// Fixtures live in test/fixtures/ (override with FIXTURE_DIR, e.g. CAD-Preview's
// examples/OpenSCAD). When a native `openscad` is on PATH the output is also
// diffed byte-for-byte against the binary-path oracle; otherwise (CI) each
// case asserts the expected CSG primitives instead.
//
// Usage: node --test test/smoke.test.mjs
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
const FIXDIR = process.env.FIXTURE_DIR ?? join(HERE, "fixtures");

const HAS_ORACLE = (() => {
  try {
    execFileSync("openscad", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

// Substrings every correct .csg must contain (used when no oracle is available).
const EXPECT = {
  minimal: ["cube(size = 10"],
  parametric: ["cube(size = [20, 10, 5]"],
  "include-main": ["cube(size = 8"],
  "colour-booleans": ["difference()", "sphere("],
};

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
    if (name === "include-main") {
      // Stage under the real name: the fixture uses `include <...>` (library
      // form), which resolves against the input's directory — MEMFS root
      // here, the same way cwd=source-dir works on the binary path.
      extraFiles["/include-lib.scad"] = readFileSync(join(FIXDIR, "include-lib.scad"), "utf8");
    }
    const t0 = Date.now();
    const csg = await renderToCsg(scad, { extraFiles });
    const ms = Date.now() - t0;
    if (HAS_ORACLE) {
      const oracle = binaryCsg(name);
      console.log(`${name}: wasm ${ms}ms, ${csg.length} bytes (oracle ${oracle.length})`);
      assert.equal(csg, oracle);
    } else {
      console.log(`${name}: wasm ${ms}ms, ${csg.length} bytes (no oracle on PATH)`);
      for (const needle of EXPECT[name]) assert.ok(csg.includes(needle), `missing ${needle}`);
    }
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
