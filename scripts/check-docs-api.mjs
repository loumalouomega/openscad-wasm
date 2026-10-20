#!/usr/bin/env node
// Fails when docs/api/reference.md and src/openscad.d.ts disagree about the
// public API. Names are matched as `identifier` code spans in the reference.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const dts = readFileSync(join(ROOT, "src/openscad.d.ts"), "utf8");
const ref = readFileSync(join(ROOT, "docs/api/reference.md"), "utf8");

const exported = new Set();
for (const m of dts.matchAll(/^export declare (?:function|class|const)\s+(\w+)/gm)) exported.add(m[1]);
for (const m of dts.matchAll(/^export (?:interface|type)\s+(\w+)/gm)) exported.add(m[1]);

// Types that are intentionally described in prose rather than by name.
const OPTIONAL = new Set([
  "InitOptions", "EvaluateOptions", "EvaluateResult", "BuiltArgs", "EmscriptenFS", "FormatInfo",
  "Format", "DefineValue", "Diagnostics", "IndexedMesh", "Renderer", "RenderResult", "RenderOptions",
  "ScadParameter", "LIBRARY_ROOT", "FONT_ROOT", "FORMATS", "getFormat", "formatDefine",
]);

const missing = [...exported].filter((n) => !OPTIONAL.has(n) && !new RegExp("`[^`]*\\b" + n + "\\b[^`]*`").test(ref));
if (missing.length) {
  console.error("Exported but not documented in docs/api/reference.md:\n  " + missing.join("\n  "));
  process.exit(1);
}

// Reverse: every call-like `name(` in the reference's headings must exist.
const documented = new Set();
for (const m of ref.matchAll(/^###? `?(\w+)\(/gm)) documented.add(m[1]);
for (const m of ref.matchAll(/^\| `(\w+)\(/gm)) documented.add(m[1]);
const stale = [...documented].filter((n) => !exported.has(n));
if (stale.length) {
  console.error("Documented but not exported by src/openscad.d.ts:\n  " + stale.join("\n  "));
  process.exit(1);
}
console.log(`docs:check ok (${exported.size} exports)`);
