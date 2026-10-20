# Command line

The package installs an `openscad-wasm` binary:

```bash
npx @loumalouomega/openscad-wasm model.scad -o model.stl -D width=60
cat model.scad | npx @loumalouomega/openscad-wasm - --format svg > out.svg
```

| Option | |
| --- | --- |
| `-o, --output <file>` | output file (`-` = stdout); the format comes from the extension |
| `--format <name>` | override the format ([list](/guide/formats)) |
| `-D name=value` | define a variable (repeatable) |
| `--backend manifold\|cgal` | geometry backend |
| `--enable <feature>` | experimental feature (repeatable) |
| `-p file.json -P set` | Customizer parameter file and set |
| `--summary` | print render statistics as JSON on stderr |
| `--lib <dir>` / `--font <file>` | mount a library directory / font (repeatable) |
| `--timeout <ms>` | abort after this long (runs in a worker) |
| `-q` | suppress OpenSCAD log lines |

Files referenced by `include <…>`/`use <…>` next to the input are staged automatically.
