// CJS entry — async-only surface over the ESM wrapper (same discipline as
// meshio++/fTetWild: the Emscripten factory is ESM, so this entry lazy-loads
// it with dynamic import inside each async function; no top-level await).
const _mod = () => import("./openscad.mjs");

async function initOpenSCAD(options) {
  return (await _mod()).initOpenSCAD(options);
}

function getWasmBinary(wasmPath) {
  // Synchronous (fs.readFileSync) — safe to expose directly.
  const fs = require("node:fs");
  const path = require("node:path");
  if (wasmPath) return fs.readFileSync(wasmPath);
  return fs.readFileSync(path.join(__dirname, "openscad-core.wasm"));
}

async function evaluateScad(instance, opts) {
  return (await _mod()).evaluateScad(instance, opts);
}

async function renderToCsg(scadText, options) {
  return (await _mod()).renderToCsg(scadText, options);
}

function isOpenScadWasmAbort(message) {
  const text = String((message && message.message) || message || "");
  return (
    /out of bounds|abort|RuntimeError|unreachable|null function|table index|function table|funcref table|wasmtable|signature mismatch/i.test(
      text,
    ) || /^\d+$/.test(text.trim())
  );
}

class ScadWasmError extends Error {
  constructor(message, { rc, stderr } = {}) {
    super(message);
    this.name = "ScadWasmError";
    this.rc = rc;
    this.stderr = stderr ?? [];
  }
}

module.exports = {
  initOpenSCAD,
  getWasmBinary,
  evaluateScad,
  renderToCsg,
  isOpenScadWasmAbort,
  ScadWasmError,
};
