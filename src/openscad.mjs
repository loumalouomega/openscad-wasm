// @loumalouomega/openscad-wasm — Node wrapper over the Emscripten build.
//
// Loading pattern: factory (./openscad-factory.mjs, Emscripten MODULARIZE +
// EXPORT_ES6) + separately-shipped ./openscad-core.wasm passed as `wasmBinary`
// (separately replaceable, LGPL §4 style — same layout as gmsh-wasm's
// `dist/gmsh-core.wasm`). `print`/`printErr` default to stderr-only so the
// module can never corrupt an MCP JSON-RPC stream on fd 1.
//
// Verified against the live build (see test/smoke.test.mjs):
//   - one `callMain` render per instance; a second render on the same
//     instance throws a bare-digit C++ exception pointer (the 5th abort
//     vocabulary). `renderToCsg()` therefore takes a fresh instance per call
//     unless the caller passes `reuseInstance: true` AND the build under test
//     proves re-entry.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Lazily resolved factory module (Emscripten MODULARIZE factory). */
let _factoryPromise = null;
function loadFactory() {
  if (!_factoryPromise) {
    _factoryPromise = import("./openscad-factory.mjs").catch((err) => {
      _factoryPromise = null;
      throw err;
    });
  }
  return _factoryPromise;
}

/** Lazily read .wasm bytes (separate asset, not inlined). */
let _wasmBinary = null;
export function getWasmBinary(wasmPath) {
  if (wasmPath) return readFileSync(wasmPath);
  if (!_wasmBinary) {
    _wasmBinary = readFileSync(new URL("./openscad-core.wasm", import.meta.url));
  }
  return _wasmBinary;
}

/**
 * Instantiate the module. Mirrors the proven 20lives shape
 * ({noInitialRun, noExitRuntime, print, printErr, instantiateWasm}) with
 * stderr-only defaults.
 */
export async function initOpenSCAD(options = {}) {
  const OpenSCAD = (await loadFactory()).default;
  const wasmBinary = options.wasmBinary ?? getWasmBinary(options.wasmPath);
  const module = {
    noInitialRun: true,
    noExitRuntime: true,
    // NOTE: Emscripten captures print/printErr at instantiation; rebinding
    // them on the live instance has no effect. Pass collection callbacks here.
    print: options.collect
      ? (...args) => options.collect.push(args.join(" "))
      : (...args) => console.error(...args),
    printErr: options.collect
      ? (...args) => options.collect.push(args.join(" "))
      : (...args) => console.error(...args),
    // NOTE: this glue ignores a Module.wasmBinary property and always
    // locates openscad.wasm next to the factory via locateFile/new URL.
    // Inject separately-shipped bytes here instead: the callback receives
    // the WebAssembly.Instance (NOT the {module, instance} result object —
    // passing that trips `missing Wasm export: __main_argc_argv`).
    instantiateWasm(imports, receiveInstance) {
      WebAssembly.instantiate(wasmBinary, imports).then(
        (result) => receiveInstance(result.instance),
        (err) => {
          throw err;
        },
      );
    },
    ...options,
    // Caller overrides win for print/printErr/wasmBinary, but these two are
    // load-bearing for multi-render processes and must stay on.
    noInitialRun: true,
    noExitRuntime: true,
  };
  delete module.wasmBinary;
  delete module.wasmPath;
  delete module.collect;
  return OpenSCAD(module);
}

/**
 * 5th-vocabulary abort classifier — same shape as the kernel services'
 * isXWasmAbort copies: Emscripten aborts surface as RuntimeErrors, and C++
 * exceptions escaping callMain surface as bare-digit exception pointers.
 */
export function isOpenScadWasmAbort(message) {
  const text = String((message && message.message) || message || "");
  return (
    /out of bounds|abort|RuntimeError|unreachable|null function|table index|function table|funcref table|wasmtable|signature mismatch/i.test(
      text,
    ) || /^\d+$/.test(text.trim())
  );
}

function fsOp(fs, op, path, data) {
  try {
    if (op === "write") fs.writeFile(path, data);
    else if (op === "unlink") fs.unlink(path);
  } catch {
    // Best-effort staging cleanup; the render error below carries the signal.
  }
}

/**
 * Evaluate .scad sources to an output file (usually .csg) via callMain.
 *
 * @param {object} instance  Module from initOpenSCAD().
 * @param {object} opts
 * @param {Record<string,string>} opts.files  MEMFS path -> contents. Keep
 *   paths <= 10 chars (fixed MEMFS-path discipline).
 * @param {string[]} opts.args  argv after the program name, e.g.
 *   ['--backend=manifold', '/in.scad', '-o', '/o.csg'].
 * @param {string} opts.outPath  MEMFS path of the output to read back.
 * @returns {{rc:number, output:string, stderr:string[]}}
 */
export async function evaluateScad(instance, { files = {}, args = [], outPath }) {
  const stderr = [];
  void stderr;
  try {
    for (const [p, c] of Object.entries(files)) {
      fsOp(instance.FS, "unlink", p);
      instance.FS.writeFile(p, c);
    }
    const rc = instance.callMain(args);
    let output = "";
    if (outPath) {
      output = instance.FS.readFile(outPath, { encoding: "utf8" });
    }
    // NOTE: stderr collection happens via initOpenSCAD({collect}) — the
    // Emscripten print handlers are captured at instantiation.
    return { rc, output, stderr: [] };
  } finally {
    for (const p of [...Object.keys(files), outPath].filter(Boolean)) {
      fsOp(instance.FS, "unlink", p);
    }
  }
}

/**
 * One-shot .scad -> .csg render on a FRESH instance (see single-use note).
 * Returns the .csg text; throws ScadWasmError (with .rc/.stderr) on failure.
 */
export class ScadWasmError extends Error {
  constructor(message, { rc, stderr } = {}) {
    super(message);
    this.name = "ScadWasmError";
    this.rc = rc;
    this.stderr = stderr ?? [];
  }
}

export async function renderToCsg(scadText, options = {}) {
  const {
    defines = {},
    backend = "manifold",
    extraFiles = {},
    wasmBinary,
    wasmPath,
  } = options;
  const stderrLines = [];
  const instance = await initOpenSCAD({ wasmBinary, wasmPath, collect: stderrLines });
  const args = [`--backend=${backend}`];
  for (const [k, v] of Object.entries(defines)) {
    args.push("-D", `${k}=${v}`);
  }
  args.push("/in.scad", "-o", "/o.csg");
  try {
    const { rc, output, stderr } = await evaluateScad(instance, {
      files: { "/in.scad": scadText, ...extraFiles },
      args,
      outPath: "/o.csg",
    });
    void stderr;
    if (rc !== 0) {
      throw new ScadWasmError(`openscad exited with status ${rc}`, { rc, stderr: stderrLines });
    }
    return output;
  } catch (err) {
    if (err instanceof ScadWasmError) throw err;
    if (isOpenScadWasmAbort(err)) {
      throw new ScadWasmError(`openscad WASM aborted: ${String((err && err.message) || err)}`, {
        stderr: [],
      });
    }
    throw err;
  }
}
