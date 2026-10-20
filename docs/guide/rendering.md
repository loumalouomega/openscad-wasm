# Rendering

## One-shot

```js
import { renderToCsg } from '@loumalouomega/openscad-wasm';
const csg = await renderToCsg('sphere(5);');
```

## Low level

```js
import { initOpenSCAD, evaluateScad } from '@loumalouomega/openscad-wasm';

const stderr = [];
const instance = await initOpenSCAD({ collect: stderr });

const { rc, output } = await evaluateScad(instance, {
  files: { '/in.scad': 'cube(10);' },
  args: ['--backend=manifold', '/in.scad', '-o', '/o.csg'],
  outPath: '/o.csg',
});
```

`evaluateScad()` stages `files` into MEMFS, calls `callMain(args)`, reads `outPath` back as UTF-8 and removes everything it staged.

## Other output formats

`-o` selects the exporter by extension (e.g. `/o.stl`). `evaluateScad()` reads `outPath` as UTF-8 text, which suits `.csg` and ASCII `.stl`. For binary formats, omit `outPath`, call `instance.FS.readFile(path)` yourself after it returns, and unlink the file afterwards.

## Custom wasm location

```js
import { initOpenSCAD, getWasmBinary } from '@loumalouomega/openscad-wasm';

await initOpenSCAD({ wasmPath: '/opt/openscad-core.wasm' });
// or inject bytes you fetched yourself
await initOpenSCAD({ wasmBinary: getWasmBinary() });
```

The wasm is also exported as `@loumalouomega/openscad-wasm/openscad-core.wasm`.
