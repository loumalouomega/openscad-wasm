# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-10-20

### Fixed

- `scripts/build-wasm.sh` no longer warns and continues when a submodule patch
  is partially applied or no longer matches the pinned checkout. Each patch must
  now either apply cleanly or already be fully applied; otherwise the build
  aborts with reset instructions. This prevents a build from silently missing
  the `node,web,worker` / pure-MEMFS changes.

### Changed

- Corrected the `build-wasm.sh` header: it documents the CGAL + Manifold
  backends and the `node,web,worker` environment instead of the old
  Manifold-only probe build.

## [0.2.0] - 2026-10-20

First release with the public rendering API. The wrapper now covers the full
Node/browser surface built in this cycle: multi-format rendering, workers, a
CLI, libraries/fonts and Customizer support.

### Added

- `render(scad, options)` — render to `stl`, `binstl`, `asciistl`, `obj`, `off`,
  `wrl`, `3mf`, `dxf`, `svg`, `pov`, `echo`, `ast`, `param`, `term` and `nef3`
  in addition to `csg`, returning `{ output, format, stderr, diagnostics, summary? }`.
- `renderToStl()` (binary STL `Uint8Array`) and `renderToMesh()` (indexed
  `{ positions, indices }` mesh for three.js).
- `createRenderer({ reuse })` — reusable renderer with abort recovery.
- `renderInWorker()` from `@loumalouomega/openscad-wasm/worker`, with a hard
  timeout (`ScadTimeoutError`) implemented by terminating the worker.
- `openscad-wasm` CLI (`npx @loumalouomega/openscad-wasm model.scad -o model.stl`).
- Browser support: one build targets Node, web and worker; `loadWasmBinary()`
  and the `wasmUrl` option load the `.wasm` in environments without `fs`.
- Library and font mounting (`libraries`, `fonts`, `mountFiles()`,
  `mountLibrary()`, `LIBRARY_ROOT`, `FONT_ROOT`) so `use <…>` and `text()` work.
- Customizer support: `extractParameters()`, `parameters`/`parameterSet`,
  `-D` defines and `--enable` experimental features.
- Diagnostics and statistics: `parseDiagnostics()`, `diagnostics` on every
  result, and `summary` (`--summary-file` JSON).
- Pure helpers exported from the package root: `buildArgs()`, `formatDefine()`,
  `findIncludes()`, `getFormat()`, `FORMATS`, `stlToMesh()`,
  `parseBinaryStl()`, `indexMesh()`.
- TypeScript declarations for both ESM and CJS entries (`openscad.cjs.d.ts`),
  wired through the `exports` map.
- VitePress documentation site with a GitHub Pages workflow, an examples guide
  and checked code snippets; `npm run docs:check` keeps the API reference and
  `openscad.d.ts` in sync.
- Node and browser examples, plus unit, feature, docs and headless-browser tests
  with self-contained smoke fixtures (no native `openscad` binary required).
- `OPENSCAD_WASM_MEMFS_ONLY` build knob for a pure-MEMFS, bytes-in/bytes-out
  filesystem root.

### Changed

- `render()`/`renderToCsg()` use a fresh module per call by default; pass
  `instance` or use `createRenderer({ reuse: true })` to opt into reuse.
- Logging defaults to stderr so stdout stays clean for MCP JSON-RPC; pass
  `collect` to capture lines instead.
- `evaluateScad()` gained a `binary` option to read output files as bytes.
- Package metadata: documentation homepage, `worker` subpath export, `bin`
  entry, keywords, and the CJS/ESM `types` conditions.
- `getWasmBinary()` now relies on `process.getBuiltinModule` (Node ≥ 20.16);
  use the async `loadWasmBinary()` on older Node versions or in browsers.
- CI builds dependencies with caching, runs a headless Chromium test, skips
  docs-only changes, cancels superseded branch runs and publishes to npm when a
  `v*` tag is pushed.

### Fixed

- CI syntax check for wrapper entries (`node --check` with file input).
- libffi autoreconf in the dependency build (`libltdl-dev` provides `ltdl.m4`).
- Shared static-file server for the browser test and `example:browser`.
- CJS consumers get correct async typings.

## [0.1.0] - 2026-10-20

Initial release: OpenSCAD (pinned at `openscad-2026.10-TEST4`, commit `7bbf6038`)
compiled with Emscripten 6.0.5, with CGAL and Manifold backends. Exposed
`renderToCsg()`, `initOpenSCAD()`, `evaluateScad()`, `getWasmBinary()`,
`isOpenScadWasmAbort()` and `ScadWasmError`; shipped a prebuilt `.wasm`, dual
ESM/CJS entries and TypeScript types for Node ≥ 18.

[Unreleased]: https://github.com/loumalouomega/openscad-wasm/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/loumalouomega/openscad-wasm/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/loumalouomega/openscad-wasm/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/loumalouomega/openscad-wasm/releases/tag/v0.1.0
