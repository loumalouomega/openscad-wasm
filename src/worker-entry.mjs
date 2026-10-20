// Worker-side entry for renderInWorker(): runs one render per message in a
// fresh module, so the host can enforce timeouts by terminating the worker.
// Works as a Node worker_thread and as a browser module Worker.
import { render } from "./openscad.mjs";

async function handle(msg, reply) {
  try {
    const { output, ...rest } = await render(msg.scad, msg.options);
    const transfer = output instanceof Uint8Array ? [output.buffer] : [];
    reply({ id: msg.id, ok: true, result: { output, ...rest } }, transfer);
  } catch (err) {
    reply({
      id: msg.id,
      ok: false,
      error: {
        name: err?.name,
        message: String(err?.message ?? err),
        rc: err?.rc,
        stderr: err?.stderr,
        diagnostics: err?.diagnostics,
      },
    });
  }
}

if (typeof process !== "undefined" && process.versions?.node) {
  const spec = "node:worker_threads";
  const { parentPort } = await import(/* @vite-ignore */ spec);
  parentPort.on("message", (msg) => handle(msg, (m, t) => parentPort.postMessage(m, t)));
} else {
  self.onmessage = (e) => handle(e.data, (m, t) => self.postMessage(m, t));
}
