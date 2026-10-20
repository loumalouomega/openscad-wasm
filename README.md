# OpenSCAD-WASM

[![ci](https://github.com/loumalouomega/openscad-wasm/actions/workflows/ci.yml/badge.svg)](https://github.com/loumalouomega/openscad-wasm/actions/workflows/ci.yml)
[![docs](https://github.com/loumalouomega/openscad-wasm/actions/workflows/docs.yml/badge.svg)](https://loumalouomega.github.io/openscad-wasm/)
[![npm version](https://img.shields.io/npm/v/%40loumalouomega%2Fopenscad-wasm.svg?logo=npm&color=cb3837)](https://www.npmjs.com/package/@loumalouomega/openscad-wasm)
[![npm downloads](https://img.shields.io/npm/dm/%40loumalouomega%2Fopenscad-wasm.svg)](https://www.npmjs.com/package/@loumalouomega/openscad-wasm)
[![types](https://img.shields.io/badge/types-included-3178c6?logo=typescript&logoColor=white)](https://loumalouomega.github.io/openscad-wasm/guide/typescript)
[![node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654ff0?logo=webassembly&logoColor=white)](https://webassembly.org)
[![license](https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg)](LICENSE)

[OpenSCAD](https://openscad.org) — the programmer's solid 3D CAD modeller — compiled to **WebAssembly** for Node. Evaluate `.scad` to `.csg`/`.stl` with **no `openscad` binary on `PATH`**.

- ⚡ **Zero install** — the prebuilt `.wasm` ships in the package; Node ≥ 18, no toolchain
- 🧩 **Small async API** — one-shot `renderToCsg()` or low-level `initOpenSCAD()` + `evaluateScad()`; TypeScript types included
- 🔧 **CGAL + Manifold** backends, Manifold by default at runtime
- 📦 Dual **ESM + CJS** entry points, no top-level await; logging goes to stderr so stdout stays clean for MCP JSON-RPC
- 🧵 Single-threaded by design (no pthreads, no workers)

> **📚 Full documentation:** <https://loumalouomega.github.io/openscad-wasm/>

Built for [CAD-Preview](https://github.com/loumalouomega/CAD-Preview)'s
[OpenSCAD WASM port](https://github.com/loumalouomega/CAD-Preview/blob/main/doc/roadmap.md#build-and-bundle-an-openscad-wasm-port)
roadmap item, following the same recipe as `@loumalouomega/gmsh-wasm`,
`mmg-wasm` and `float-tetwild-wasm`. A Manifold-only build was attempted first
and is non-viable at the pinned snapshot (upstream's manifold sources include
CGAL headers unconditionally), so the build links CGAL with Manifold as the
default `--backend`, exactly like the playground.

**Status:** smoke tests pass (5/5, output byte-identical to the native binary); the `.wasm` is ≈ 24 MB. See [Probe results](https://loumalouomega.github.io/openscad-wasm/probe-results).

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

## Project structure

```
openscad/            OpenSCAD source (git submodule, pinned)
third-party/         patches/ + dependency sources/builds (gitignored)
scripts/             build-deps.sh, build-wasm.sh, stage-dist.sh
src/                 hand-written wrapper: openscad.{mjs,cjs,d.ts}
test/                smoke tests + fixtures
docs/                VitePress documentation site
probe-results/       dated build/probe logs
dist/                build artifacts (gitignored; produced by CI)
```

## Building from source

Needs Debian/Ubuntu packages `autoconf autoconf-archive automake autopoint bison flex gettext gperf libltdl-dev libtool ninja-build pkg-config texinfo` plus `meson`. A full build takes hours.

```bash
source ~/emsdk-6.0.5/emsdk_env.sh   # Emscripten 6.0.5, matches the probe build
scripts/build-deps.sh               # zlib … boost into the emsdk sysroot
scripts/build-wasm.sh               # node-module artifact into build-node-module/
npm test                            # fixtures vs binary-path oracle
```

`scripts/build-deps.sh` is a native (no-docker) port of
DSchroer/openscad-wasm's `Dockerfile.base` stages with pinned refs, minus
CGAL/gmp/mpfr (Manifold-only). See `THIRD_PARTY_NOTICES.md` for the full list.

## npm scripts

| Script | Does |
|--------|------|
| `npm run build:deps` | build C/C++ dependencies into the emsdk sysroot |
| `npm run build:wasm` | build OpenSCAD with Emscripten |
| `npm test` | smoke tests (needs `dist/`) |
| `npm run docs:dev` | live-preview the docs |
| `npm run docs:build` | build the docs site |

## Known issues

- Instances are single-use in some builds; `renderToCsg()` instantiates fresh per call (~150 ms).
- `text()` in evaluated-mesh output needs mounted fonts (CSG export works).

## Licensing

This package is distributed under **GPL-3.0-or-later** (see `LICENSE`).
The combined `.wasm` statically links OpenSCAD (GPL-2.0-or-later),
Manifold (Apache-2.0) and the support libraries in `THIRD_PARTY_NOTICES.md`;
GPL-3.0-or-later is the compatible floor for that combination.

This is an independent packaging effort, not affiliated with or endorsed by
the OpenSCAD authors. Corresponding source: the `openscad` submodule at the
pinned commit plus `scripts/build-deps.sh` / `scripts/build-wasm.sh` — see
`LICENSE` ("Corresponding source") for the full offer.
