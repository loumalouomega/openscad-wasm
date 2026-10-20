# API reference

Mirrors `src/openscad.d.ts`.

## Rendering

### `render(scadText, options?)`

Renders to any [format](/guide/formats) on a fresh instance (or `options.instance`). Resolves to `{ output, format, stderr, diagnostics, summary? }`; rejects with [`ScadWasmError`](#scadwasmerror).

| Option | Type | Default | |
| --- | --- | --- | --- |
| `format` | `Format` | `'csg'` | output format |
| `backend` | `'manifold' \| 'cgal'` | `'manifold'` | `--backend` |
| `defines` | `Record<string, string \| number \| boolean \| any[]>` | `{}` | `-D` overrides |
| `enable` | `string[]` | `[]` | `--enable=` experimental features (`roof`, `lazy-union`, `import-function`) |
| `parameters`, `parameterSet` | `object`, `string` | | Customizer JSON and set name |
| `summary` | `boolean \| string[]` | | collect `--summary` statistics: `true`, or any of `cache`, `time`, `camera`, `geometry`, `bounding-box`, `area` |
| `exportOptions` | `Record<string, …>` | | `-O section/key=value` |
| `colorscheme`, `hardwarnings`, `quiet` | | | passed through |
| `args` | `string[]` | | extra raw argv |
| `extraFiles` | `Record<string, string \| Uint8Array>` | | extra MEMFS files |
| `libraries`, `fonts` | | | mounted at instantiation ([guide](/guide/libraries-fonts)) |
| `instance` | `OpenSCADInstance` | | reuse an instance |
| `wasmBinary`, `wasmPath`, `wasmUrl` | | shipped | wasm location |

### `renderToCsg(scad, options?)` · `renderToStl(scad, options?)` · `renderToMesh(scad, options?)`

Shortcuts returning a CSG `string`, binary STL `Uint8Array`, or an indexed `{ positions: Float32Array, indices: Uint32Array }`.

### `createRenderer({ reuse?, ...defaults })`

Returns `{ render(scad, options?), dispose() }`. With `reuse: true` one module is kept and discarded after an abort.

### `renderInWorker(scad, options?, { timeoutMs? })`

From `@loumalouomega/openscad-wasm/worker`. See [Workers](/guide/worker).

## Customizer and helpers

| Function | |
| --- | --- |
| `extractParameters(scad)` | Customizer parameters (pure JS) |
| `findIncludes(scad)` | `include`/`use` targets |
| `parseDiagnostics(lines)` | categorise log lines |
| `stlToMesh(bytes)`, `parseBinaryStl`, `indexMesh` | STL → mesh |
| `buildArgs(options)` | the argv `render()` would use |
| `isOpenScadWasmAbort(err)` | see [Errors](/guide/errors) |

## Low level

### `initOpenSCAD(options?)`

Instantiates the module → `Promise<OpenSCADInstance>`.

| Option | Type | |
| --- | --- | --- |
| `collect` | `string[]` | push every log line here (nothing is echoed) |
| `libraries`, `fonts` | | see [guide](/guide/libraries-fonts) |
| `print`, `printErr` | `(...args) => void` | override the sink |
| `wasmBinary`, `wasmPath`, `wasmUrl` | | wasm location |

### `evaluateScad(instance, { files, args, outPath, binary? })`

Stages `files`, runs `callMain(args)`, reads `outPath`, cleans up. Returns `Promise<{ rc, output, stderr }>`.

### `mountFiles(instance, files, root?)` · `mountLibrary(instance, files)`

Write files (creating directories) / under `/libraries`.

### `loadWasmBinary({ wasmPath?, wasmUrl? })` · `getWasmBinary(wasmPath?)`

Async (Node + browser) / sync (Node ≥ 20.16) wasm loaders.

## Types

### `OpenSCADInstance`

```ts
interface OpenSCADInstance {
  callMain(args: string[]): number;
  FS: EmscriptenFS; // writeFile, readFile, unlink, mkdirTree, readdir
  ENV: Record<string, string>;
}
```

### `ScadWasmError`

`extends Error` with `rc?: number`, `stderr: string[]` and `diagnostics`.

### `ScadTimeoutError`

`extends Error` with `timeoutMs`.

::: tip CommonJS
In the CJS entry every function is async (including the pure helpers): `await extractParameters(src)`.
:::
