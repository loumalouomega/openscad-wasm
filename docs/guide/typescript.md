# TypeScript

Types ship as `dist/openscad.d.ts` and are picked up automatically.

```ts
import {
  renderToCsg,
  type RenderOptions,
  ScadWasmError,
} from '@loumalouomega/openscad-wasm';

const opts: RenderOptions = { defines: { width: 60 }, backend: 'manifold' };
const csg: string = await renderToCsg('cube(width);', opts);
```

See the [API reference](/api/reference) for every exported type.
