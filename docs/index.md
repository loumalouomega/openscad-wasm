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
    details: renderToCsg() for one-shots, initOpenSCAD() + evaluateScad() for full control, with TypeScript types included.
  - icon: 🔧
    title: CGAL + Manifold
    details: Built from upstream OpenSCAD with both geometry backends; Manifold is the default at runtime.
  - icon: 📦
    title: ESM and CJS
    details: Dual entry points, every export async, no top-level await. stdout stays clean for MCP JSON-RPC.
---

## Quick example

```js
import { renderToCsg } from '@loumalouomega/openscad-wasm';

const csg = await renderToCsg('cube(10);');
console.log(csg);
```

::: warning Licensing
The `.wasm` statically links OpenSCAD (GPL-2.0-or-later); this package is **GPL-3.0-or-later**. See [Licensing](/licensing).
:::
