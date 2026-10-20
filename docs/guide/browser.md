# Browser usage

One build serves Node **and** browsers (`-sENVIRONMENT=node,web,worker`, pure MEMFS). The wrapper uses `fetch` to load `openscad-core.wasm` outside Node.

```js
import { render } from '@loumalouomega/openscad-wasm';

const { output } = await render('cube(10);', { format: 'stl' });
const url = URL.createObjectURL(new Blob([output], { type: 'model/stl' }));
```

- With a bundler, the `.wasm` is resolved relative to the module URL. To control the location pass `wasmUrl` (or `wasmBinary`).
- Serve `.wasm` with `Content-Type: application/wasm`.
- No cross-origin isolation is needed: the build is single-threaded.
- Use `renderInWorker` (or your own Worker) to keep the UI responsive.

A runnable page lives in [`examples/browser/`](https://github.com/loumalouomega/openscad-wasm/tree/master/examples/browser) and is exercised by a headless-Chromium test in CI.
