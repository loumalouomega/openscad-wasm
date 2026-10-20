# Output formats

`render(scad, { format })` exports to any format the build supports and returns `{ output, format, stderr, diagnostics, summary? }`. Text formats return a `string`; binary formats (`stl`, `binstl`, `3mf`) return a `Uint8Array`.

| `format` | Result | Notes |
| --- | --- | --- |
| `csg` (default) | text | evaluated CSG tree |
| `stl` / `binstl` | bytes | binary STL |
| `asciistl` | text | ASCII STL |
| `obj`, `off`, `wrl` | text | |
| `3mf` | bytes | ZIP container (lib3mf) |
| `dxf`, `svg` | text | 2D models only |
| `pov` | text | POV-Ray |
| `echo`, `ast`, `term`, `param` | text | no geometry is exported |
| `nef3` | text | CGAL Nef polyhedron |

::: warning Not available: `png` and `pdf`
Upstream's Emscripten configuration forces `NULLGL=ON` (no OpenGL, so no image rendering) and `ENABLE_CAIRO=OFF` (no PDF). Requesting them throws a `TypeError`. Render to SVG or a mesh and rasterise on your side.
:::

```js
import { render, renderToStl, renderToMesh } from '@loumalouomega/openscad-wasm';

const { output } = await render('cube(10);', { format: 'obj' });
const stl = await renderToStl('sphere(5);');       // Uint8Array
const { positions, indices } = await renderToMesh('cube(10);'); // for three.js
```

`renderToMesh` parses a binary STL and welds identical vertices into an indexed mesh (`Float32Array` positions, `Uint32Array` indices).

## Diagnostics and statistics

```js
const r = await render('echo("hi"); cube(1);', { summary: true });
r.diagnostics.echo;   // ['"hi"']
r.diagnostics.warnings;
r.summary;            // OpenSCAD --summary-file JSON (bounding box, area, timings…)
```

Failures throw `ScadWasmError` carrying `rc`, `stderr` and the same `diagnostics`.

## Backend, defines and experimental features

```js
await render(src, {
  backend: 'cgal',                  // 'manifold' (default) | 'cgal'
  defines: { width: 60, name: 'box' }, // -D; strings that aren't literals are quoted
  enable: ['lazy-union'],            // --enable=… (build has EXPERIMENTAL=ON)
  exportOptions: { 'export-3mf/color-mode': 'model' }, // -O
  hardwarnings: true,
});
```
