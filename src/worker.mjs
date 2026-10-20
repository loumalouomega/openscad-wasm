// renderInWorker(): run a render in a worker with a hard timeout. A runaway
// model (huge minkowski, infinite recursion, ...) cannot be interrupted from
// inside the single-threaded wasm, so the worker is terminated instead.
import { ScadTimeoutError, ScadWasmError } from "./core.mjs";

let nextId = 1;

async function spawn() {
  const url = new URL("./worker-entry.mjs", import.meta.url);
  if (typeof process !== "undefined" && process.versions?.node) {
    const spec = "node:worker_threads";
    const { Worker } = await import(/* @vite-ignore */ spec);
    const w = new Worker(url);
    return {
      post: (m) => w.postMessage(m),
      onMessage: (f) => w.on("message", f),
      onError: (f) => w.on("error", f),
      terminate: () => w.terminate(),
    };
  }
  const w = new Worker(url, { type: "module" });
  return {
    post: (m) => w.postMessage(m),
    onMessage: (f) => (w.onmessage = (e) => f(e.data)),
    onError: (f) => (w.onerror = (e) => f(new Error(e.message))),
    terminate: () => w.terminate(),
  };
}

/**
 * @param {string} scadText
 * @param {object} [options]  same as render(); must be structured-cloneable (no `instance`)
 * @param {{timeoutMs?: number}} [limits]
 * @returns {Promise<{output, format, stderr, diagnostics, summary?}>}
 */
export async function renderInWorker(scadText, options = {}, { timeoutMs } = {}) {
  if (options.instance) throw new TypeError("renderInWorker() cannot take an `instance`");
  const worker = await spawn();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    let timer;
    const done = (fn, v) => {
      clearTimeout(timer);
      worker.terminate();
      fn(v);
    };
    if (timeoutMs) timer = setTimeout(() => done(reject, new ScadTimeoutError(timeoutMs)), timeoutMs);
    worker.onError((err) => done(reject, err));
    worker.onMessage((msg) => {
      if (msg.id !== id) return;
      if (msg.ok) return done(resolve, msg.result);
      const e = msg.error;
      done(reject, new ScadWasmError(e.message, { rc: e.rc, stderr: e.stderr, diagnostics: e.diagnostics }));
    });
    worker.post({ id, scad: scadText, options });
  });
}

export { ScadTimeoutError, ScadWasmError };
