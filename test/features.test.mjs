// Feature tests that need the built wasm (dist/). Skipped when dist/ is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = join(ROOT, "dist", "openscad.mjs");
const have = existsSync(DIST);
const t = (name, fn) => test(name, { skip: have ? false : "dist/ not built (npm run build first)" }, fn);
const load = () => import(DIST);

t("binary STL: cube(10) is 12 triangles", async () => {
  const { render } = await load();
  const { output, format } = await render("cube(10);", { format: "stl" });
  assert.equal(format, "stl");
  assert.ok(output instanceof Uint8Array);
  const tris = new DataView(output.buffer, output.byteOffset).getUint32(80, true);
  assert.equal(tris, 12);
  assert.equal(output.length, 84 + 50 * 12);
});

t("renderToMesh welds a cube to 8 vertices", async () => {
  const { renderToMesh } = await load();
  const { positions, indices } = await renderToMesh("cube(10);");
  assert.equal(positions.length / 3, 8);
  assert.equal(indices.length, 36);
});

t("text formats: off, obj, wrl, asciistl, dxf, svg", async () => {
  const { render } = await load();
  assert.match((await render("cube(2);", { format: "off" })).output, /^OFF/);
  assert.match((await render("cube(2);", { format: "obj" })).output, /\nv /);
  assert.match((await render("cube(2);", { format: "asciistl" })).output, /solid/);
  assert.match((await render("square(5);", { format: "svg" })).output, /<svg/);
  assert.match((await render("square(5);", { format: "dxf" })).output, /ENTITIES|SECTION/);
});

t("3mf export is a zip", async () => {
  const { render } = await load();
  const { output } = await render("cube(3);", { format: "3mf" });
  assert.deepEqual([...output.slice(0, 2)], [0x50, 0x4b]);
});

t("diagnostics: echo and warnings are parsed", async () => {
  const { render } = await load();
  const r = await render('echo("hi", 1+1); cube(1);', { format: "csg" });
  assert.ok(r.diagnostics.echo.some((l) => l.includes("hi")));
});

t("syntax errors throw ScadWasmError with diagnostics", async () => {
  const { render, ScadWasmError } = await load();
  await assert.rejects(render("cube(", {}), (e) => e instanceof ScadWasmError && e.stderr.length > 0);
});

t("failed renders leave process.exitCode unchanged", async () => {
  const { render } = await load();
  const before = process.exitCode;
  await assert.rejects(render("cube(", {}));
  assert.equal(process.exitCode, before);
});

t("summary statistics are returned", async () => {
  const { render } = await load();
  const r = await render("cube(10);", { format: "stl", summary: true });
  assert.ok(r.summary, "expected --summary-file JSON");
});

t("libraries are found through OPENSCADPATH", async () => {
  const { render } = await load();
  const r = await render("use <mylib/box.scad>; box(4);", {
    libraries: { "mylib/box.scad": "module box(s){cube(s);}" },
  });
  assert.match(r.output, /cube\(size = \[4, 4, 4\]/);
});

t("nested extraFiles directories are created", async () => {
  const { render } = await load();
  const r = await render("include <sub/dir/a.scad>; a();", {
    extraFiles: { "/sub/dir/a.scad": "module a(){cube(5);}" },
  });
  assert.match(r.output, /cube\(size = \[5, 5, 5\]/);
});

t("customizer parameter sets apply", async () => {
  const { render } = await load();
  const parameters = { parameterSets: { big: { width: "50" } }, fileFormatVersion: "1" };
  const r = await render("width = 10;\ncube([width, 1, 1]);", { parameters, parameterSet: "big" });
  assert.match(r.output, /50/);
});

t("renderer recovers after a failed render", async () => {
  const { createRenderer } = await load();
  const r = createRenderer({ reuse: true });
  await assert.rejects(r.render("cube("));
  assert.match((await r.render("cube(1);")).output, /cube/);
});

t("renderInWorker returns a result and honours the timeout", async () => {
  const { renderInWorker, ScadTimeoutError } = await import(join(ROOT, "dist", "worker.mjs"));
  const ok = await renderInWorker("cube(1);", { format: "csg" }, { timeoutMs: 60000 });
  assert.match(ok.output, /cube/);
  // Instantiation alone takes far longer than 1 ms, so this must time out.
  await assert.rejects(renderInWorker("cube(1);", {}, { timeoutMs: 1 }), ScadTimeoutError);
});

t("CJS entry exposes the same surface", async () => {
  const { createRequire } = await import("node:module");
  const cjs = createRequire(import.meta.url)(join(ROOT, "dist", "openscad.cjs"));
  const csg = await cjs.renderToCsg("cube(2);");
  assert.match(csg, /cube/);
  await assert.rejects(cjs.renderToCsg("cube("), (e) => e instanceof cjs.ScadWasmError);
});
