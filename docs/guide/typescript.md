# TypeScript

Types ship as `dist/openscad.d.ts` and are picked up automatically.

```ts
import {
  render,
  renderToCsg,
  extractParameters,
  type RenderOptions,
  type RenderResult,
  type ScadParameter,
  ScadWasmError,
} from '@loumalouomega/openscad-wasm';

const opts: RenderOptions = { format: 'stl', defines: { width: 60 }, summary: true };
const r: RenderResult = await render('cube(width);', opts);
const bytes = r.output as Uint8Array; // binary formats return bytes, text formats a string

const params: ScadParameter[] = extractParameters(source);
```

CommonJS consumers get `dist/openscad.cjs.d.ts`, where every function (including pure helpers such as `extractParameters`) returns a `Promise`.

`renderInWorker` types are exported from the same file and available at `@loumalouomega/openscad-wasm/worker`.

See the [API reference](/api/reference) for every exported type.
