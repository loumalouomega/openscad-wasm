---
layout: home
hero:
  name: OpenSCAD-WASM
  text: OpenSCAD in WebAssembly
  tagline: Evaluate .scad to .csg from Node — no openscad binary on PATH.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: API reference
      link: /api/reference
    - theme: alt
      text: GitHub
      link: https://github.com/loumalouomega/openscad-wasm
features:
  - icon: ⚡
    title: Zero install
    details: A prebuilt .wasm ships in the npm package. No toolchain, no native binary, Node ≥ 18.
  - icon: 🧩
    title: Small async API
    details: render() to STL, OBJ, 3MF, SVG and more, meshes for three.js, Customizer parameters, a CLI and workers with timeouts — with TypeScript types.
  - icon: 🔧
    title: CGAL + Manifold
    details: Built from upstream OpenSCAD with both geometry backends; Manifold is the default at runtime.
  - icon: 📦
    title: ESM and CJS
    details: One build for Node and browsers, ESM and CJS, no top-level await. stdout stays clean for MCP JSON-RPC.
---

## Quick example

```js check
import { renderToCsg } from '@loumalouomega/openscad-wasm';

const csg = await renderToCsg('cube(10);');
console.log(csg);
```

::: warning Licensing
The `.wasm` statically links OpenSCAD (GPL-2.0-or-later); this package is **GPL-3.0-or-later**. See [Licensing](/licensing).
:::
