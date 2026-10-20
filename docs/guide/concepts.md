# Concepts

## Single-use instances

OpenSCAD's statics do not survive a second `callMain` render on the same instance in the reference build (`openscad-wasm@0.0.4`): the next call throws a bare-digit C++ exception pointer. `renderToCsg()` therefore instantiates a **fresh module per call** (~150 ms).

This package's own build was observed to re-enter successfully with `noExitRuntime: true` (2nd and 3rd renders returned rc 0; see [Probe results](/probe-results)), so sharing an instance with `evaluateScad()` is viable — but verify it for your workload.

## MEMFS I/O

The build uses Emscripten's in-memory filesystem (`NODERAWFS` is disabled). Inputs are staged under `/`, outputs are read back and unlinked after each `evaluateScad()` call. No real disk access happens.

## Geometry backends

The build links CGAL **and** Manifold. A Manifold-only build is not viable at the pinned upstream snapshot (its manifold sources include CGAL headers unconditionally). Select the backend at runtime with `backend: 'manifold' | 'cgal'` (default `manifold`).

## stdout purity

`print` and `printErr` both default to **stderr** (`console.error`) so fd 1 stays clean for MCP JSON-RPC streams. To capture output, pass `collect: []` to `initOpenSCAD()`: Emscripten bakes the handlers in at instantiation, so they cannot be rebound afterwards.

## Single-threaded

No pthreads and no workers. The package is intentionally `{ threads: false }`.
