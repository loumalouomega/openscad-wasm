# Architecture

```
openscad/ (submodule, pinned)
  └─ third-party/patches/*.patch  → emsdk sysroot path, MEMFS-only knob
scripts/build-deps.sh   → zlib, expat, libffi, glib, freetype, harfbuzz,
                          fontconfig, libxml2, libzip, lib3mf, gmp, mpfr,
                          CGAL, boost  → $EMSDK sysroot
scripts/build-wasm.sh   → emcmake + ninja → build-node-module/openscad.{js,wasm}
scripts/stage-dist.sh   → dist/openscad-factory.mjs + openscad-core.wasm
src/openscad.{mjs,cjs,d.ts} → dist/ (hand-written wrapper)
```

## Design decisions

- **Separate `.wasm`.** A custom CMake build type (not `Release`) avoids upstream's `-sSINGLE_FILE`, so the wasm stays a separately replaceable asset.
- **Wrapper loads bytes itself.** The generated glue ignores `Module.wasmBinary`; the wrapper injects bytes through `instantiateWasm(imports, cb)` with `cb(instance)`.
- **CJS is a thin async shim** over the ESM wrapper (dynamic `import()`), with no top-level await.
- **Patches, not forks.** Upstream deltas are small patches applied idempotently by `build-wasm.sh`.
- **CGAL included.** Manifold-only is non-viable at the pinned snapshot.
