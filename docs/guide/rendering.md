# Rendering

## One-shot

```js check
import { renderToCsg } from '@loumalouomega/openscad-wasm';
const csg = await renderToCsg('sphere(5);');
```

## Low level

```js check
import { initOpenSCAD, evaluateScad } from '@loumalouomega/openscad-wasm';

const stderr = [];
const instance = await initOpenSCAD({ collect: stderr });

const { rc, output, stderr: log } = await evaluateScad(instance, {
  files: { '/in.scad': 'cube(10);' },
  args: ['--backend=manifold', '/in.scad', '-o', '/o.csg'],
  outPath: '/o.csg',
});
```

`evaluateScad()` stages `files` into MEMFS (creating directories), calls `callMain(args)`, reads `outPath` back (UTF-8, or bytes with `binary: true`) and removes everything it staged. `stderr` holds the log lines emitted during that call.

## Other output formats

Use the high-level [`render()`](/guide/formats). With `evaluateScad()` pass `binary: true` to read `outPath` as a `Uint8Array`; `-o` selects the exporter by extension and `--export-format=binstl` forces binary STL.

## Custom wasm location

```js check
import { initOpenSCAD, getWasmBinary } from '@loumalouomega/openscad-wasm';

await initOpenSCAD({ wasmPath: '/opt/openscad-core.wasm' }); // Node
await initOpenSCAD({ wasmUrl: '/assets/openscad-core.wasm' }); // browser
// or inject bytes you fetched yourself
await initOpenSCAD({ wasmBinary: getWasmBinary() });
```

The wasm is also exported as `@loumalouomega/openscad-wasm/openscad-core.wasm`.
