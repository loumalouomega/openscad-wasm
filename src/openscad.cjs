// CJS entry — async-only surface over the ESM wrapper (the Emscripten factory
// is ESM, so every function lazy-loads it with dynamic import; no top-level
// await). Pure helpers are async here too: `await extractParameters(src)`.
const _mod = () => import("./openscad.mjs");
const _worker = () => import("./worker.mjs");

const lazy = (name, loader = _mod) => async (...args) => (await loader())[name](...args);

function getWasmBinary(wasmPath) {
  // Synchronous (fs.readFileSync) — safe to expose directly.
  const fs = require("node:fs");
  const path = require("node:path");
  if (wasmPath) return fs.readFileSync(wasmPath);
  return fs.readFileSync(path.join(__dirname, "openscad-core.wasm"));
}

function isOpenScadWasmAbort(message) {
  const text = String((message && message.message) || message || "");
  return (
    /out of bounds|abort|RuntimeError|unreachable|null function|table index|function table|funcref table|wasmtable|signature mismatch/i.test(
      text,
    ) || /^\d+$/.test(text.trim())
  );
}

// Errors thrown by the ESM wrapper are ESM classes; match them by name so
// `instanceof` works for CJS consumers too.
class ScadWasmError extends Error {
  static [Symbol.hasInstance](v) {
    return v instanceof Error && v.name === "ScadWasmError";
  }
  constructor(message, { rc, stderr, diagnostics } = {}) {
    super(message);
    this.name = "ScadWasmError";
    this.rc = rc;
    this.stderr = stderr ?? [];
    this.diagnostics = diagnostics;
  }
}

class ScadTimeoutError extends Error {
  static [Symbol.hasInstance](v) {
    return v instanceof Error && v.name === "ScadTimeoutError";
  }
  constructor(timeoutMs) {
    super(`OpenSCAD render exceeded ${timeoutMs} ms`);
    this.name = "ScadTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

module.exports = {
  initOpenSCAD: lazy("initOpenSCAD"),
  loadWasmBinary: lazy("loadWasmBinary"),
  evaluateScad: lazy("evaluateScad"),
  render: lazy("render"),
  renderToCsg: lazy("renderToCsg"),
  renderToStl: lazy("renderToStl"),
  renderToMesh: lazy("renderToMesh"),
  renderInWorker: lazy("renderInWorker", _worker),
  createRenderer: async (opts) => (await _mod()).createRenderer(opts),
  mountFiles: lazy("mountFiles"),
  mountLibrary: lazy("mountLibrary"),
  extractParameters: lazy("extractParameters"),
  findIncludes: lazy("findIncludes"),
  parseDiagnostics: lazy("parseDiagnostics"),
  parseBinaryStl: lazy("parseBinaryStl"),
  stlToMesh: lazy("stlToMesh"),
  getWasmBinary,
  isOpenScadWasmAbort,
  ScadWasmError,
  ScadTimeoutError,
};
