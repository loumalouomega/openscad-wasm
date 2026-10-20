// Pure-JS tests: no wasm, no dist/ required (run in the quick CI job).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildArgs, extractParameters, findIncludes, formatDefine, getFormat,
  indexMesh, isOpenScadWasmAbort, parseBinaryStl, parseDiagnostics, stlToMesh, ScadWasmError,
} from "../src/core.mjs";
import { parseCliArgs } from "../src/cli.mjs";

test("getFormat resolves aliases and rejects png/pdf", () => {
  assert.equal(getFormat("STL").exportFormat, "binstl");
  assert.equal(getFormat("asciistl").binary, false);
  assert.equal(getFormat("3mf").binary, true);
  assert.throws(() => getFormat("png"), /not available/);
  assert.throws(() => getFormat("pdf"), TypeError);
});

test("buildArgs: defaults", () => {
  const { args, inPath, outPath } = buildArgs();
  assert.deepEqual(args, ["--backend=manifold", "/in.scad", "-o", "/o.csg"]);
  assert.equal(inPath, "/in.scad");
  assert.equal(outPath, "/o.csg");
});

test("buildArgs: stl, defines, features, summary, params", () => {
  const b = buildArgs({
    format: "stl",
    backend: "CGAL",
    defines: { width: 60, name: "box", on: true, v: [1, 2] },
    enable: ["lazy-union"],
    summary: true,
    parameters: { parameterSets: {} },
    parameterSet: "big",
  });
  assert.equal(b.outPath, "/o.stl");
  assert.ok(b.args.includes("--export-format=binstl"));
  assert.ok(b.args.includes("--backend=cgal"));
  assert.ok(b.args.includes("--enable=lazy-union"));
  assert.deepEqual(b.args.slice(b.args.indexOf("-D"), b.args.indexOf("-D") + 2), ["-D", "width=60"]);
  assert.ok(b.args.includes('name="box"'));
  assert.ok(b.args.includes("v=[1,2]"));
  assert.ok(b.args.includes("--summary-file"));
  assert.deepEqual(b.args.slice(-3), ["/in.scad", "-o", "/o.stl"]);
  assert.equal(b.paramPath, "/p.json");
});

test("buildArgs validates input", () => {
  assert.throws(() => buildArgs({ backend: "x" }), /backend/);
  assert.throws(() => buildArgs({ parameterSet: "a" }), /together/);
});

test("formatDefine quotes only non-literals", () => {
  assert.equal(formatDefine("60"), "60");
  assert.equal(formatDefine("true"), "true");
  assert.equal(formatDefine('"x"'), '"x"');
  assert.equal(formatDefine("hello"), '"hello"');
  assert.equal(formatDefine([1, 2]), "[1,2]");
});

test("parseDiagnostics categorises lines", () => {
  const d = parseDiagnostics(["WARNING: a", "ERROR: b", "ECHO: 1", "DEPRECATED: c", "Rendering..."]);
  assert.deepEqual(d.warnings, ["a"]);
  assert.deepEqual(d.errors, ["b"]);
  assert.deepEqual(d.echo, ["1"]);
  assert.deepEqual(d.deprecations, ["c"]);
  assert.deepEqual(d.other, ["Rendering..."]);
});

function stlOf(tris) {
  const buf = new Uint8Array(84 + tris.length * 50);
  const dv = new DataView(buf.buffer);
  dv.setUint32(80, tris.length, true);
  tris.forEach((t, i) => t.forEach((x, j) => dv.setFloat32(84 + i * 50 + 12 + j * 4, x, true)));
  return buf;
}

test("STL parsing and vertex welding", () => {
  const stl = stlOf([
    [0, 0, 0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 1, 1, 0, 0, 1, 0],
  ]);
  const flat = parseBinaryStl(stl);
  assert.equal(flat.length, 18);
  const { positions, indices } = indexMesh(flat);
  assert.equal(positions.length / 3, 4);
  assert.deepEqual([...indices], [0, 1, 2, 1, 3, 2]);
  assert.equal(stlToMesh(stl).indices.length, 6);
  assert.throws(() => parseBinaryStl(new Uint8Array(10)), RangeError);
  assert.throws(() => parseBinaryStl(stl.slice(0, 100)), RangeError);
});

test("findIncludes", () => {
  assert.deepEqual(findIncludes("include <a/b.scad>\n  use <c.scad>;\ncube(1);"), ["a/b.scad", "c.scad"]);
});

test("extractParameters reads Customizer annotations", () => {
  const src = `
/* [Size] */
// width of the box
width = 20; // [10:5:100]
height = 5; // [1:10]
label = "hi";
mode = "a"; // [a:Alpha, b:Beta]
flag = true;
/* [Hidden] */
secret = 1;
module m() {}
late = 3;
`;
  const p = extractParameters(src);
  assert.deepEqual(p.map((x) => x.name), ["width", "height", "label", "mode", "flag"]);
  assert.deepEqual([p[0].min, p[0].step, p[0].max], [10, 5, 100]);
  assert.equal(p[0].description, "width of the box");
  assert.equal(p[0].group, "Size");
  assert.equal(p[2].value, "hi");
  assert.deepEqual(p[3].options, [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]);
  assert.equal(p[4].value, true);
});

test("abort classifier", () => {
  assert.ok(isOpenScadWasmAbort("1124712"));
  assert.ok(isOpenScadWasmAbort(new Error("memory access out of bounds")));
  assert.ok(!isOpenScadWasmAbort("syntax error"));
});

test("ScadWasmError carries diagnostics", () => {
  const e = new ScadWasmError("x", { rc: 1, stderr: ["ERROR: bad"] });
  assert.deepEqual(e.diagnostics.errors, ["bad"]);
});

test("CLI argument parsing", () => {
  const o = parseCliArgs(["m.scad", "-o", "out.stl", "-D", "w=3", "-Dh=4", "--enable=roof", "--timeout", "500", "--backend", "cgal"]);
  assert.equal(o.input, "m.scad");
  assert.equal(o.format, "binstl");
  assert.deepEqual(o.defines, { w: "3", h: "4" });
  assert.deepEqual(o.enable, ["roof"]);
  assert.equal(o.timeoutMs, 500);
  assert.equal(o.backend, "cgal");
  assert.equal(parseCliArgs(["-", "--format", "svg"]).format, "svg");
  assert.throws(() => parseCliArgs(["a.scad", "-o", "x.unknown"]), /infer format/);
  assert.throws(() => parseCliArgs(["--nope"]), /unknown option/);
  assert.throws(() => parseCliArgs(["-D", "bad"]), /name=value/);
});
