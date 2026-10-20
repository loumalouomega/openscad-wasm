# Customizer parameters

## Reading the parameters

`extractParameters(source)` is pure JavaScript (no wasm needed) and reads the Customizer annotations OpenSCAD's GUI uses:

```js
import { extractParameters } from '@loumalouomega/openscad-wasm';

extractParameters(`
/* [Size] */
// width of the box
width = 20; // [10:5:100]
mode = "a"; // [a:Alpha, b:Beta]
`);
// [{ name: 'width', value: 20, group: 'Size', description: 'width of the box', min: 10, step: 5, max: 100 },
//  { name: 'mode', value: 'a', options: [{ value: 'a', label: 'Alpha' }, …] }]
```

It is a heuristic reader of top-level assignments before the first `module`/`function`; the `[Hidden]` group is skipped.

## Applying values

Either override with `defines`, or use an OpenSCAD parameter-set file:

```js
await render(src, {
  parameters: { fileFormatVersion: '1', parameterSets: { big: { width: '50' } } },
  parameterSet: 'big',
});
```
