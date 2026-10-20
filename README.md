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
- 📤 **Many formats** — STL (binary/ASCII), OBJ, OFF, WRL, 3MF, DXF, SVG, POV, CSG, plus `echo`/`ast`; binary-safe output
- 🧊 **Mesh output** — `renderToMesh()` gives an indexed `Float32Array`/`Uint32Array` mesh for three.js
- 🎛️ **Customizer** — `extractParameters()`, parameter sets, `-D` defines, experimental `--enable` features
- 🔤 **Libraries & fonts** — mount MCAD/user libraries and fonts so `use <…>` and `text()` work
- 🧵 **Workers & timeouts** — `renderInWorker()` enforces a hard time limit
- 🌐 **Node and browser** — one build, ESM + CJS, TypeScript types; logging stays on stderr for MCP JSON-RPC
- 🖥️ **CLI** — `npx @loumalouomega/openscad-wasm model.scad -o model.stl`
- 🔧 **CGAL + Manifold** backends, Manifold by default

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

Other formats, meshes, diagnostics:

```js
import { render, renderToMesh, extractParameters } from '@loumalouomega/openscad-wasm';

const { output, diagnostics, summary } = await render(src, { format: 'stl', summary: true }); // Uint8Array
const { positions, indices } = await renderToMesh('cube(10);');
const params = extractParameters(src); // Customizer parameters, no wasm needed
```

```bash
npx @loumalouomega/openscad-wasm model.scad -o model.stl -D width=60 --timeout 30000
```

CJS consumers: `const { renderToCsg } = require('@loumalouomega/openscad-wasm');`
— every entry is async, no top-level await anywhere.

## API

| Export | Shape |
| --- | --- |
| `render(scad, opts)` | Render to any [format](https://loumalouomega.github.io/openscad-wasm/guide/formats) → `{ output, format, stderr, diagnostics, summary? }`. Options: `format`, `backend`, `defines`, `enable`, `parameters`/`parameterSet`, `summary`, `extraFiles`, `libraries`, `fonts`, … |
| `renderToCsg` / `renderToStl` / `renderToMesh` | Shortcuts → CSG text / binary STL bytes / indexed mesh. |
| `renderInWorker(scad, opts, { timeoutMs })` | From `…/worker`; hard timeout via worker termination (`ScadTimeoutError`). |
| `createRenderer({ reuse })` | Renderer with fixed libraries/fonts; optional instance reuse with abort recovery. |
| `extractParameters(scad)` | Customizer parameters (pure JS). |
| `initOpenSCAD(opts)` / `evaluateScad(instance, …)` | Low level: instantiate (`collect`, `libraries`, `fonts`, `wasmUrl`…) and run `callMain` (`binary`). |
| `mountFiles` / `mountLibrary` | Write files / libraries into MEMFS. |
| `ScadWasmError`, `isOpenScadWasmAbort` | Errors carry `{ rc, stderr, diagnostics }`; abort classifier. |

`png` and `pdf` export are **not available**: upstream's Emscripten build forces `NULLGL` and disables Cairo, and threads (`MANIFOLD_PAR`) are off too. See the [API reference](https://loumalouomega.github.io/openscad-wasm/api/reference).

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
src/                 hand-written wrapper: openscad.{mjs,cjs,d.ts}, core.mjs, worker*.mjs, cli.mjs
bin/                 openscad-wasm CLI
examples/            node/ and browser/ demos (see examples/README.md)
test/                unit, smoke, feature and browser tests + fixtures
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
| `npm run test:unit` | pure-JS tests (no wasm needed) |
| `npm test` | unit + smoke + feature + browser tests (wasm tests need `dist/`) |
| `npm run test:browser` | headless-Chromium test (needs Playwright + `dist/`) |
| `npm run docs:dev` | live-preview the docs |
| `npm run docs:check` | fail if `docs/api/reference.md` and `src/openscad.d.ts` disagree |
| `npm run example:browser` | serve the browser example on :8080 |
| `npm run docs:build` | build the docs site |

## Known issues

- Instances are single-use in some builds; `render()` instantiates fresh per call (~150 ms). `createRenderer({ reuse: true })` opts into reuse.
- `text()` in evaluated meshes needs fonts: pass `fonts: { 'X.ttf': bytes }`.
- No PNG/PDF export and no threads (forced off by upstream's Emscripten configuration).
- The new wasm-dependent features (formats, fonts, worker, browser) are covered by tests that run in CI against the full build.

## Licensing

This package is distributed under **GPL-3.0-or-later** (see `LICENSE`).
The combined `.wasm` statically links OpenSCAD (GPL-2.0-or-later),
Manifold (Apache-2.0) and the support libraries in `THIRD_PARTY_NOTICES.md`;
GPL-3.0-or-later is the compatible floor for that combination.

This is an independent packaging effort, not affiliated with or endorsed by
the OpenSCAD authors. Corresponding source: the `openscad` submodule at the
pinned commit plus `scripts/build-deps.sh` / `scripts/build-wasm.sh` — see
`LICENSE` ("Corresponding source") for the full offer.
