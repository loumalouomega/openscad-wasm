// @loumalouomega/openscad-wasm — wrapper over the Emscripten build (Node and browser).
//
// Loading pattern: factory (./openscad-factory.mjs, Emscripten MODULARIZE +
// EXPORT_ES6) + separately-shipped ./openscad-core.wasm passed through
// `instantiateWasm` (separately replaceable, LGPL §4 style — same layout as
// gmsh-wasm's `dist/gmsh-core.wasm`). `print`/`printErr` default to stderr-only
// so the module can never corrupt an MCP JSON-RPC stream on fd 1.
//
// Instances: renderToCsg()/render() take a FRESH instance per call by default.
// Re-entry on one instance works in this build with `noExitRuntime: true`, but a
// reference build (openscad-wasm@0.0.4) throws a bare-digit C++ exception
// pointer on the second render; pass `instance` (or use createRenderer({reuse}))
// to opt in.

import {
  FORMATS,
  ScadTimeoutError,
  ScadWasmError,
  buildArgs,
  extractParameters,
  findIncludes,
  formatDefine,
  getFormat,
  indexMesh,
  isOpenScadWasmAbort,
  parseBinaryStl,
  parseDiagnostics,
  stlToMesh,
} from "./core.mjs";

export {
  FORMATS,
  ScadTimeoutError,
  ScadWasmError,
  buildArgs,
  extractParameters,
  findIncludes,
  formatDefine,
  getFormat,
  indexMesh,
  isOpenScadWasmAbort,
  parseBinaryStl,
  parseDiagnostics,
  stlToMesh,
};

const IS_NODE = typeof process !== "undefined" && !!process.versions?.node;

/** Where libraries are mounted; exported to OpenSCAD as OPENSCADPATH. */
export const LIBRARY_ROOT = "/libraries";
/** Where fonts are mounted; fontconfig is pointed at /fonts/fonts.conf. */
export const FONT_ROOT = "/fonts";

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

let _wasmBinary = null;

/**
 * Read the shipped .wasm synchronously (Node only; cached). In the browser use
 * loadWasmBinary(), which fetches it.
 */
export function getWasmBinary(wasmPath) {
  if (!IS_NODE) throw new Error("getWasmBinary() is Node-only; use loadWasmBinary() in the browser");
  if (typeof process.getBuiltinModule !== "function") {
    throw new Error("getWasmBinary() needs Node >= 20.16; use `await loadWasmBinary()` instead");
  }
  const { readFileSync } = process.getBuiltinModule("node:fs");
  if (wasmPath) return readFileSync(wasmPath);
  if (!_wasmBinary) _wasmBinary = readFileSync(new URL("./openscad-core.wasm", import.meta.url));
  return _wasmBinary;
}

/** Async wasm loader that works in Node and browsers. `wasmUrl` overrides the location. */
export async function loadWasmBinary({ wasmPath, wasmUrl } = {}) {
  if (IS_NODE && !wasmUrl) {
    const spec = "node:fs"; // variable specifier: keeps bundlers from resolving it for the browser
    const { readFileSync } = await import(/* @vite-ignore */ spec);
    if (wasmPath) return readFileSync(wasmPath);
    if (!_wasmBinary) _wasmBinary = readFileSync(new URL("./openscad-core.wasm", import.meta.url));
    return _wasmBinary;
  }
  const res = await fetch(wasmUrl ?? new URL("./openscad-core.wasm", import.meta.url));
  if (!res.ok) throw new Error(`failed to fetch openscad-core.wasm: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function toBytes(data) {
  return typeof data === "string" ? data : data instanceof Uint8Array ? data : new Uint8Array(data);
}

function mkdirp(FS, dir) {
  if (!dir || dir === "/") return;
  try {
    FS.mkdirTree(dir);
  } catch {
    /* already exists */
  }
}

function dirname(p) {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "/" : p.slice(0, i);
}

/**
 * Write `files` (path -> string | bytes) under `root`, creating directories.
 * Used for libraries (MCAD, user code) and arbitrary imports.
 */
export function mountFiles(instance, files, root = "") {
  for (const [rel, data] of Object.entries(files)) {
    const path = (root + "/" + rel).replace(/\/+/g, "/");
    mkdirp(instance.FS, dirname(path));
    instance.FS.writeFile(path, toBytes(data));
  }
}

/** Mount library sources under /libraries (searched through OPENSCADPATH). */
export function mountLibrary(instance, files) {
  mountFiles(instance, files, LIBRARY_ROOT);
}

const FONTS_CONF = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${FONT_ROOT}</dir>
  <cachedir>/tmp/fontconfig</cachedir>
</fontconfig>
`;

/**
 * Instantiate the module.
 *
 * @param {object} [options]
 * @param {string[]} [options.collect]  push every stdout/stderr line here (nothing is echoed)
 * @param {Record<string,string|Uint8Array>} [options.libraries]  mounted at /libraries, exported as OPENSCADPATH
 * @param {Record<string,Uint8Array>} [options.fonts]  font files (name -> bytes) so text() works
 * @param {Uint8Array} [options.wasmBinary]  / `wasmPath` (Node) / `wasmUrl` (browser)
 */
export async function initOpenSCAD(options = {}) {
  const OpenSCAD = (await loadFactory()).default;
  const wasmBinary = options.wasmBinary ?? (await loadWasmBinary(options));
  const lines = options.collect ?? [];
  const capture = (...args) => {
    const text = args.join(" ");
    lines.push(text);
    if (!options.collect) console.error(text);
  };
  const { libraries, fonts, collect, wasmPath, wasmUrl, wasmBinary: _wb, ...rest } = options;
  void collect; void wasmPath; void wasmUrl; void _wb;

  const module = {
    noInitialRun: true,
    noExitRuntime: true,
    // NOTE: Emscripten captures print/printErr at instantiation; rebinding
    // them on the live instance has no effect, hence the sink above.
    print: capture,
    printErr: capture,
    preRun: [
      (m) => {
        m.ENV.OPENSCADPATH = LIBRARY_ROOT;
        mkdirp(m.FS, LIBRARY_ROOT);
        if (fonts && Object.keys(fonts).length) {
          m.ENV.FONTCONFIG_FILE = `${FONT_ROOT}/fonts.conf`;
          m.ENV.FONTCONFIG_PATH = FONT_ROOT;
          mkdirp(m.FS, FONT_ROOT);
          m.FS.writeFile(`${FONT_ROOT}/fonts.conf`, FONTS_CONF);
          for (const [name, bytes] of Object.entries(fonts)) {
            m.FS.writeFile(`${FONT_ROOT}/${name}`, toBytes(bytes));
          }
        }
        if (libraries) mountFiles({ FS: m.FS }, libraries, LIBRARY_ROOT);
      },
    ],
    // NOTE: this glue ignores a Module.wasmBinary property and always locates
    // openscad.wasm next to the factory via locateFile/new URL. Inject
    // separately-shipped bytes here instead: the callback receives the
    // WebAssembly.Instance (NOT the {module, instance} result object — passing
    // that trips `missing Wasm export: __main_argc_argv`).
    instantiateWasm(imports, receiveInstance) {
      WebAssembly.instantiate(wasmBinary, imports).then(
        (result) => receiveInstance(result.instance),
        (err) => {
          throw err;
        },
      );
    },
    ...rest,
    // Load-bearing for multi-render processes; callers cannot turn these off.
    noInitialRun: true,
    noExitRuntime: true,
  };
  const instance = await OpenSCAD(module);
  Object.defineProperty(instance, "__lines", { value: lines, enumerable: false });
  return instance;
}

/**
 * Low-level evaluation via callMain.
 *
 * @param {object} instance  from initOpenSCAD()
 * @param {object} opts
 * @param {Record<string,string|Uint8Array>} [opts.files]  MEMFS path -> contents (directories are created)
 * @param {string[]} [opts.args]  argv after the program name
 * @param {string} [opts.outPath]  MEMFS path to read back
 * @param {boolean} [opts.binary]  read `outPath` as a Uint8Array instead of UTF-8
 * @returns {{rc:number, output:string|Uint8Array, stderr:string[]}}
 */
export async function evaluateScad(instance, { files = {}, args = [], outPath, binary = false }) {
  const lines = instance.__lines;
  const start = lines ? lines.length : 0;
  try {
    for (const [p, c] of Object.entries(files)) {
      mkdirp(instance.FS, dirname(p));
      try {
        instance.FS.unlink(p);
      } catch {
        /* not present */
      }
      instance.FS.writeFile(p, toBytes(c));
    }
    const rc = instance.callMain(args);
    let output = binary ? new Uint8Array(0) : "";
    if (outPath && rc === 0) {
      output = binary ? instance.FS.readFile(outPath) : instance.FS.readFile(outPath, { encoding: "utf8" });
    }
    return { rc, output, stderr: lines ? lines.slice(start) : [] };
  } finally {
    for (const p of [...Object.keys(files), outPath].filter(Boolean)) {
      try {
        instance.FS.unlink(p);
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}

/**
 * Render OpenSCAD source to any supported format.
 *
 * @param {string} scadText
 * @param {object} [options]
 * @param {string} [options.format='csg']  see FORMATS (stl, off, obj, wrl, 3mf, dxf, svg, pov, echo, ast, ...)
 * @param {'manifold'|'cgal'} [options.backend='manifold']
 * @param {Record<string,string|number|boolean|any[]>} [options.defines]  `-D` overrides
 * @param {string[]} [options.enable]  experimental features (`--enable=`)
 * @param {object} [options.parameters] + {string} [options.parameterSet]  Customizer JSON + set name
 * @param {boolean|string[]} [options.summary]  also collect render statistics (`--summary`)
 * @param {Record<string,string|Uint8Array>} [options.extraFiles]  extra MEMFS files (includes, imports)
 * @param {Record<string,string|Uint8Array>} [options.libraries] / `fonts`  mounted at instantiation
 * @param {object} [options.instance]  reuse an existing instance instead of instantiating
 * @returns {Promise<{output:string|Uint8Array, format:string, stderr:string[], diagnostics:object, summary?:object}>}
 */
export async function render(scadText, options = {}) {
  const built = buildArgs(options);
  const { extraFiles = {}, wasmBinary, wasmPath, wasmUrl, libraries, fonts } = options;
  const owned = !options.instance;
  const stderrLines = [];
  const instance =
    options.instance ??
    (await initOpenSCAD({ wasmBinary, wasmPath, wasmUrl, libraries, fonts, collect: stderrLines }));

  const files = { [built.inPath]: scadText, ...extraFiles };
  if (built.paramPath) files[built.paramPath] = JSON.stringify(options.parameters);

  const fail = (message, extra = {}) =>
    new ScadWasmError(message, { ...extra, stderr: owned ? stderrLines : (instance.__lines?.slice(-100) ?? []) });

  let result;
  try {
    result = await evaluateScad(instance, {
      files,
      args: built.args,
      outPath: built.outPath,
      binary: built.format.binary,
    });
  } catch (err) {
    if (err instanceof ScadWasmError) throw err;
    if (isOpenScadWasmAbort(err)) {
      throw fail(`openscad WASM aborted: ${String((err && err.message) || err)}`);
    }
    // callMain succeeded but the output file is missing (e.g. empty geometry).
    if (err && (err.code === "ENOENT" || err.errno === 44 || /ENOENT|No such file/.test(String(err.message)))) {
      throw fail("openscad produced no output (empty or invalid geometry?)", { rc: 0 });
    }
    throw err;
  }

  const stderr = owned ? stderrLines : result.stderr;
  if (result.rc !== 0) {
    throw new ScadWasmError(`openscad exited with status ${result.rc}`, { rc: result.rc, stderr });
  }

  let summary;
  if (built.summaryPath) {
    try {
      summary = JSON.parse(instance.FS.readFile(built.summaryPath, { encoding: "utf8" }));
      instance.FS.unlink(built.summaryPath);
    } catch {
      summary = undefined;
    }
  }
  return {
    output: result.output,
    format: built.format.name,
    stderr,
    diagnostics: parseDiagnostics(stderr),
    ...(summary ? { summary } : {}),
  };
}

/**
 * One-shot .scad -> .csg render on a FRESH instance (see the instance note).
 * Returns the .csg text; throws ScadWasmError (with .rc/.stderr/.diagnostics).
 */
export async function renderToCsg(scadText, options = {}) {
  return (await render(scadText, { ...options, format: "csg" })).output;
}

/** Render to a binary STL and return the bytes. */
export async function renderToStl(scadText, options = {}) {
  return (await render(scadText, { ...options, format: "binstl" })).output;
}

/**
 * Render and return an indexed triangle mesh, ready for three.js / WebGL:
 * `{ positions: Float32Array, indices: Uint32Array }`.
 */
export async function renderToMesh(scadText, options = {}) {
  return stlToMesh(await renderToStl(scadText, options));
}

/**
 * A renderer bound to fixed libraries/fonts. With `reuse: true` it keeps one
 * instance (faster, but verify re-entry for your workload) and discards it
 * whenever a render aborts; otherwise it is a thin wrapper that instantiates per
 * call.
 */
export function createRenderer({ reuse = false, ...base } = {}) {
  let instance = null;
  return {
    async render(scadText, options = {}) {
      const merged = { ...base, ...options };
      if (!reuse) return render(scadText, merged);
      if (!instance) {
        const { libraries, fonts, wasmBinary, wasmPath, wasmUrl } = merged;
        instance = await initOpenSCAD({ libraries, fonts, wasmBinary, wasmPath, wasmUrl, collect: [] });
      }
      try {
        return await render(scadText, { ...merged, instance });
      } catch (err) {
        if (isOpenScadWasmAbort(err) || (err instanceof ScadWasmError && !err.rc)) instance = null;
        throw err;
      }
    },
    dispose() {
      instance = null;
    },
  };
}
