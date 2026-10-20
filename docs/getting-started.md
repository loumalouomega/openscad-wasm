# Getting started

## Install

```bash
npm install @loumalouomega/openscad-wasm
```

The package ships a prebuilt `openscad-core.wasm`, ESM/CJS entries and TypeScript types. Requires Node ≥ 18.

## Render a model

```js check
import { renderToCsg } from '@loumalouomega/openscad-wasm';

const csg = await renderToCsg('cube(10);');
```

CommonJS works the same way — every entry is async (including pure helpers such as `extractParameters`):

```js check
const { renderToCsg } = require('@loumalouomega/openscad-wasm');
```

## Customizer parameters (`-D`)

```js check
const csg = await renderToCsg(source, {
  defines: { width: 60 },
  backend: 'manifold',
});
```

## Library files

`include <...>` / `use <...>` resolve against the MEMFS root, so stage extra files with `extraFiles`:

```js check
const csg = await renderToCsg('include <lib.scad>\nbox(8);', {
  extraFiles: { '/lib.scad': 'module box(s){cube(s,center=true);}' },
});
```

::: tip
Keep MEMFS paths short (≤ 10 characters).
:::

## Next steps

- [Concepts](/guide/concepts) — why each render uses a fresh instance
- [Output formats](/guide/formats) — STL, OBJ, 3MF, SVG, …
- [Rendering](/guide/rendering) — the low-level API
- [Command line](/guide/cli)
- [API reference](/api/reference)
