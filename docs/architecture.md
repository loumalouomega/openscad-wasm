# Architecture

```
openscad/ (submodule, pinned)
  └─ third-party/patches/*.patch  → emsdk sysroot path, MEMFS-only knob
scripts/build-deps.sh   → zlib, expat, libffi, glib, freetype, harfbuzz,
                          fontconfig, libxml2, libzip, lib3mf, gmp, mpfr,
                          CGAL, boost  → $EMSDK sysroot
scripts/build-wasm.sh   → emcmake + ninja → build-node-module/openscad.{js,wasm}
scripts/stage-dist.sh   → dist/openscad-factory.mjs + openscad-core.wasm
src/*.mjs, openscad.cjs, openscad.d.ts → dist/ (hand-written wrapper)
bin/openscad-wasm.mjs   → CLI over dist/
```

## Wrapper layout

| File | Role |
| --- | --- |
| `src/core.mjs` | Pure helpers with no wasm or fs: format table, argv builder, diagnostics parser, STL/mesh parsing, Customizer extraction, error classes. Unit-tested without a build |
| `src/openscad.mjs` | Wasm-facing API: `initOpenSCAD`, `evaluateScad`, `render*`, `createRenderer`, library/font mounting. Portable across Node and browsers |
| `src/openscad.cjs` | Async CJS shim |
| `src/worker.mjs`, `src/worker-entry.mjs` | `renderInWorker` host and worker side (hard timeouts) |
| `src/cli.mjs`, `bin/openscad-wasm.mjs` | CLI argument parsing and the executable |

## Design decisions

- **Separate `.wasm`.** A custom CMake build type (not `Release`) avoids upstream's `-sSINGLE_FILE`, so the wasm stays a separately replaceable asset.
- **Wrapper loads bytes itself.** The generated glue ignores `Module.wasmBinary`; the wrapper injects bytes through `instantiateWasm(imports, cb)` with `cb(instance)`.
- **CJS is a thin async shim** over the ESM wrapper (dynamic `import()`), with no top-level await.
- **Patches, not forks.** Upstream deltas are small patches applied idempotently by `build-wasm.sh`.
- **One build for Node and browsers.** The `OPENSCAD_WASM_MEMFS_ONLY` patch switches to `ENVIRONMENT=node,web,worker` with a pure MEMFS root.
- **CGAL included.** Manifold-only is non-viable at the pinned snapshot.
