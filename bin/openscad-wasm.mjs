#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { HELP, parseCliArgs } from "../dist/cli.mjs";

function readDir(root) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[relative(root, p).split("\\").join("/")] = readFileSync(p);
    }
  };
  walk(root);
  return out;
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const o = parseCliArgs(process.argv.slice(2));
  if (o.help || (!o.input && !o.version)) {
    process.stdout.write(HELP);
    return o.help ? 0 : 2;
  }
  const { render } = await import("../dist/openscad.mjs");
  if (o.version) {
    process.stdout.write(JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version + "\n");
    return 0;
  }
  const scad = o.input === "-" ? await readStdin() : readFileSync(o.input, "utf8");

  // Stage sibling files that the model include/uses, relative to the input.
  const extraFiles = {};
  if (o.input !== "-") {
    const { findIncludes } = await import("../dist/core.mjs");
    const base = dirname(resolve(o.input));
    const seen = new Set();
    const visit = (text, dir) => {
      for (const inc of findIncludes(text)) {
        const p = resolve(dir, inc);
        if (seen.has(p)) continue;
        seen.add(p);
        try {
          const t = readFileSync(p, "utf8");
          extraFiles["/" + relative(base, p).split("\\").join("/")] = t;
          visit(t, dirname(p));
        } catch {
          /* may be a library include; OpenSCAD reports if truly missing */
        }
      }
    };
    visit(scad, base);
  }

  const libraries = {};
  for (const d of o.libs) Object.assign(libraries, readDir(d));
  const fonts = {};
  for (const f of o.fonts) fonts[f.split(/[\\/]/).pop()] = readFileSync(f);

  const options = {
    format: o.format,
    backend: o.backend,
    defines: o.defines,
    enable: o.enable,
    extraFiles,
    libraries,
    fonts,
    summary: o.summary,
    quiet: o.quiet,
  };
  if (o.parameterFile) {
    options.parameters = JSON.parse(readFileSync(o.parameterFile, "utf8"));
    options.parameterSet = o.parameterSet;
  }

  let result;
  try {
    if (o.timeoutMs) {
      const { renderInWorker } = await import("../dist/worker.mjs");
      result = await renderInWorker(scad, options, { timeoutMs: o.timeoutMs });
    } else {
      result = await render(scad, options);
    }
  } catch (err) {
    if (err.stderr && !o.quiet) process.stderr.write(err.stderr.join("\n") + "\n");
    process.stderr.write(`openscad-wasm: ${err.message}\n`);
    return 1;
  }
  if (!o.quiet) for (const l of result.stderr) process.stderr.write(l + "\n");
  if (o.summary && result.summary) process.stderr.write(JSON.stringify(result.summary, null, 2) + "\n");
  const out = typeof result.output === "string" ? Buffer.from(result.output) : Buffer.from(result.output);
  if (!o.output || o.output === "-") process.stdout.write(out);
  else writeFileSync(o.output, out);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    process.stderr.write(`openscad-wasm: ${err.message}\n`);
    process.exit(1);
  },
);
