# @loumalouomega/openscad-wasm

OpenSCAD (Manifold geometry backend) compiled to WebAssembly for Node —
evaluate `.scad` to `.csg`/`.stl` with no `openscad` binary on `PATH`.

Built for [CAD-Preview](https://github.com/loumalouomega/CAD-Preview)'s
[OpenSCAD WASM port](https://github.com/loumalouomega/CAD-Preview/blob/main/doc/roadmap.md#build-and-bundle-an-openscad-wasm-port)
roadmap item, following the same recipe as `@loumalouomega/gmsh-wasm`,
`mmg-wasm` and `float-tetwild-wasm`. Single-threaded (`{ threads: false }`
discipline — no pthreads, no workers), Manifold-only geometry backend in the
first build; CGAL remains an explicit non-goal until a probe asks for it.

Status: probe build in progress — see `probe-results/`.

## Install

```bash
npm install @loumalouomega/openscad-wasm
```

No build step for consumers — the package ships a prebuilt `.wasm`, dual
ESM/CJS entries, and TypeScript types. Node ≥ 18.

## Quick start

```js
import { renderToCsg } from '@loumalouomega/openscad-wasm';

const csg = await renderToCsg('cube(10);');
console.log(csg);
```

With `-D` overrides (Customizer parameters) and extra library files:

```js
const csg = await renderToCsg(source, {
  defines: { width: 60 },
  backend: 'manifold',
  extraFiles: { '/i.scad': librarySource }, // MEMFS staging, paths ≤ 10 chars
});
```

Lower level — one render per instance (see below):

```js
import { initOpenSCAD, evaluateScad } from '@loumalouomega/openscad-wasm';

const instance = await initOpenSCAD(); // wasmBinary + stderr-only print defaults
const { rc, output } = await evaluateScad(instance, {
  files: { '/in.scad': 'cube(10);' },
  args: ['--backend=manifold', '/in.scad', '-o', '/o.csg'],
  outPath: '/o.csg',
});
```

CJS consumers: `const { renderToCsg } = require('@loumalouomega/openscad-wasm');`
— every entry is async, no top-level await anywhere.

## API

| Export | Shape |
| --- | --- |
| `initOpenSCAD({ wasmBinary?, wasmPath?, collect?, print?, printErr? })` | Instantiate the module. `wasmBinary` defaults to the shipped `openscad-core.wasm`; all logging goes to stderr by default so fd 1 stays clean for MCP JSON-RPC. |
| `evaluateScad(instance, { files, args, outPath })` | Stage MEMFS files, `callMain(args)`, read `outPath` back, clean up. Returns `{ rc, output, stderr }`. |
| `renderToCsg(scadText, { defines?, backend?, extraFiles?, wasmBinary?, wasmPath? })` | One-shot `.scad` → `.csg` on a fresh instance. Throws `ScadWasmError` (`{ rc, stderr }`). |
| `isOpenScadWasmAbort(message)` | 5th-vocabulary abort classifier (bare-digit exception pointers included) for the kernel worker's reset path. |
| `getWasmBinary(wasmPath?)` | Read the shipped `.wasm` bytes (for `wasmBinary` injection). |

Single-use instances: OpenSCAD's statics do not survive a second `callMain`
render on the same instance (the next call throws a bare-digit C++ exception
pointer — verified live against `openscad-wasm@0.0.4`). `renderToCsg()`
therefore instantiates fresh per call (~150 ms); only pass a shared instance
to `evaluateScad()` if the build under test proves re-entry.

## Building from source

```bash
source ~/emsdk-6.0.5/emsdk_env.sh   # Emscripten 6.0.5, matches the probe build
scripts/build-deps.sh               # zlib … boost into the emsdk sysroot
scripts/build-wasm.sh               # node-module artifact into build-node-module/
npm test                            # fixtures vs binary-path oracle
```

`scripts/build-deps.sh` is a native (no-docker) port of
DSchroer/openscad-wasm's `Dockerfile.base` stages with pinned refs, minus
CGAL/gmp/mpfr (Manifold-only). See `THIRD_PARTY_NOTICES.md` for the full list.

## Licensing

This package is distributed under **GPL-3.0-or-later** (see `LICENSE`).
The combined `.wasm` statically links OpenSCAD (GPL-2.0-or-later),
Manifold (Apache-2.0) and the support libraries in `THIRD_PARTY_NOTICES.md`;
GPL-3.0-or-later is the compatible floor for that combination.

This is an independent packaging effort, not affiliated with or endorsed by
the OpenSCAD authors. Corresponding source: the `openscad` submodule at the
pinned commit plus `scripts/build-deps.sh` / `scripts/build-wasm.sh` — see
`LICENSE` ("Corresponding source") for the full offer.
