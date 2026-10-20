# Probe results

Summary of `probe-results/2026-10-19.md`. Toolchain: Emscripten 6.0.5; upstream `openscad` @ `7bbf60383`.

| Item | Result |
| --- | --- |
| Artifact size | `openscad.wasm` ≈ 24.1 MB (CGAL-inclusive, text/font stack), glue ≈ 218 KB |
| Correctness | 4 fixtures byte-identical to the native binary; `-D` override works |
| Timing (warm) | colour-booleans: native 244 ms vs wasm 93 ms; minimal: 89 ms vs 123 ms; init ≈ 324 ms once |
| Loading | ESM and CJS both render; process exits cleanly |
| Re-entry | Works with `noExitRuntime: true` (unlike `openscad-wasm@0.0.4`) |
| Abort | Deep recursion → `memory access out of bounds`; instance survives |
| `text()` | CSG export works; evaluated-mesh text needs mounted fonts (todo) |
| Manifold-only | Non-viable: manifold sources include CGAL headers unconditionally |

Open item: kernel watchdog behaviour for hanging models in a worker.

## Feature limits at the pinned snapshot

Upstream's Emscripten block (`CMakeLists.txt`) forces `ENABLE_CAIRO=OFF` (no PDF), `NULLGL=ON` (no PNG/OpenGL) and `MANIFOLD_PAR=OFF` (no threads). They are documented rather than worked around. STL (binary/ASCII), OBJ, OFF, WRL, 3MF, DXF, SVG, POV, CSG and the debug exports are available.
