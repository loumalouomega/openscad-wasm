# Workers and timeouts

The wasm is single-threaded and cannot be interrupted from inside, so a runaway model blocks its thread. `renderInWorker` runs the render in a `worker_thread` (Node) or module `Worker` (browser) and terminates it on timeout:

```js
import { renderInWorker, ScadTimeoutError } from '@loumalouomega/openscad-wasm/worker';

try {
  const { output } = await renderInWorker(src, { format: 'stl' }, { timeoutMs: 30_000 });
} catch (e) {
  if (e instanceof ScadTimeoutError) console.error('too slow');
}
```

Options must be structured-cloneable (no `instance`). Each call uses a fresh worker and module.

## Reusing instances

`createRenderer({ reuse: true })` keeps one module alive between renders and discards it automatically after an abort. This is faster, but re-entry should be verified for your workload (see [Concepts](/guide/concepts)).
