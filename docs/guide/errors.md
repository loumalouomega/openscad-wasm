# Errors & aborts

## `ScadWasmError`

`renderToCsg()` throws `ScadWasmError` when OpenSCAD exits non-zero or the module aborts:

```js
import { renderToCsg, ScadWasmError } from '@loumalouomega/openscad-wasm';

try {
  await renderToCsg('cube(');
} catch (err) {
  if (err instanceof ScadWasmError) {
    console.error(err.rc, err.stderr.join('\n'));
  }
}
```

| Field | Meaning |
| --- | --- |
| `rc` | OpenSCAD exit status (absent for aborts) |
| `stderr` | Captured output lines |
| `diagnostics` | `{ warnings, errors, echo, deprecations, other }` parsed from `stderr` |

`ScadTimeoutError` is thrown by [`renderInWorker`](/guide/worker) when `timeoutMs` elapses.

## Abort classification

`isOpenScadWasmAbort(err)` recognises Emscripten aborts (`memory access out of bounds`, `unreachable`, table/signature errors, …) **and** bare-digit C++ exception pointers (e.g. `1124712`). Use it in a worker's reset path to decide whether to discard the instance.

Observed: deep recursion surfaces as `memory access out of bounds`; the instance still renders correctly afterwards.
