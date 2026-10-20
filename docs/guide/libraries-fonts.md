# Libraries, includes and fonts

## Includes

Stage any file with `extraFiles` (directories are created for you):

```js
await render('include <sub/a.scad>; a();', {
  extraFiles: { '/sub/a.scad': 'module a(){cube(5);}' },
});
```

## Libraries

`libraries` files are mounted under `/libraries`, which is exported to OpenSCAD as `OPENSCADPATH`, so `use <mylib/box.scad>` just works:

```js
await render('use <mylib/box.scad>; box(4);', {
  libraries: { 'mylib/box.scad': 'module box(s){cube(s);}' },
});
```

For an existing instance use `mountLibrary(instance, files)` / `mountFiles(instance, files, root)`. The CLI mounts directories with `--lib <dir>`.

## Fonts (`text()`)

The build ships no fonts. Provide font files and the wrapper writes a `fonts.conf` and points fontconfig at `/fonts`:

```js
import { readFileSync } from 'node:fs';
await render('text("Hello", size = 8);', {
  format: 'stl',
  fonts: { 'Liberation.ttf': readFileSync('LiberationSans-Regular.ttf') },
});
```

::: tip
Mounting happens at instantiation (before fontconfig initialises), so pass `fonts`/`libraries` to `render()`, `initOpenSCAD()` or `createRenderer()` rather than writing them afterwards.
:::
