// Argument parsing + orchestration for bin/openscad-wasm.mjs. Kept separate (and
// free of process.exit / stdio) so it can be unit-tested.

export const HELP = `openscad-wasm — OpenSCAD in WebAssembly

Usage: openscad-wasm <input.scad|-> [-o <output>] [options]

  -o, --output <file>     output file ('-' = stdout); format from extension
      --format <name>     override format (stl, binstl, asciistl, obj, off, wrl,
                          3mf, dxf, svg, pov, csg, echo, ast, ...)
  -D <name=value>         define a variable (repeatable)
      --backend <b>       manifold (default) | cgal
      --enable <feature>  enable an experimental feature (repeatable)
  -p <file.json>          Customizer parameter file, with -P <set>
  -P <set>                Customizer parameter set name
      --summary           print render statistics as JSON on stderr
      --lib <dir>         mount a library directory (repeatable)
      --font <file>       mount a font file (repeatable)
      --timeout <ms>      abort the render after this many milliseconds
  -q, --quiet             do not print OpenSCAD log lines
  -v, --version           print the package version
  -h, --help              this help
`;

const EXT_FORMAT = { stl: "binstl", csg: "csg", obj: "obj", off: "off", wrl: "wrl", "3mf": "3mf", dxf: "dxf", svg: "svg", pov: "pov", echo: "echo", ast: "ast", term: "term", param: "param", nef3: "nef3" };

/** Parse argv (without node/script) into a plain options object. Throws on bad input. */
export function parseCliArgs(argv) {
  const o = { defines: {}, enable: [], libs: [], fonts: [], backend: "manifold" };
  const need = (i, flag) => {
    if (i + 1 >= argv.length) throw new Error(`${flag} needs a value`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.startsWith("--") ? a.indexOf("=") : -1;
    const flag = eq > 0 ? a.slice(0, eq) : a;
    const inline = eq > 0 ? a.slice(eq + 1) : undefined;
    const val = () => {
      if (inline !== undefined) return inline;
      const v = need(i, flag);
      i++;
      return v;
    };
    switch (flag) {
      case "-h": case "--help": o.help = true; break;
      case "-v": case "--version": o.version = true; break;
      case "-q": case "--quiet": o.quiet = true; break;
      case "--summary": o.summary = true; break;
      case "-o": case "--output": o.output = val(); break;
      case "--format": o.format = val(); break;
      case "--backend": o.backend = val(); break;
      case "--enable": o.enable.push(val()); break;
      case "-p": o.parameterFile = val(); break;
      case "-P": o.parameterSet = val(); break;
      case "--lib": o.libs.push(val()); break;
      case "--font": o.fonts.push(val()); break;
      case "--timeout": o.timeoutMs = Number(val()); if (!(o.timeoutMs > 0)) throw new Error("--timeout must be a positive number"); break;
      case "-D": {
        const kv = val();
        const j = kv.indexOf("=");
        if (j < 1) throw new Error(`-D expects name=value, got "${kv}"`);
        o.defines[kv.slice(0, j)] = kv.slice(j + 1);
        break;
      }
      default:
        if (a.startsWith("-D") && a.length > 2) {
          const kv = a.slice(2);
          const j = kv.indexOf("=");
          if (j < 1) throw new Error(`-D expects name=value, got "${kv}"`);
          o.defines[kv.slice(0, j)] = kv.slice(j + 1);
        } else if (a !== "-" && a.startsWith("-")) {
          throw new Error(`unknown option ${a}`);
        } else if (o.input === undefined) {
          o.input = a;
        } else {
          throw new Error(`unexpected argument ${a}`);
        }
    }
  }
  if (!o.format && o.output && o.output !== "-") {
    const ext = o.output.split(".").pop().toLowerCase();
    o.format = EXT_FORMAT[ext];
    if (!o.format) throw new Error(`cannot infer format from "${o.output}"; use --format`);
  }
  o.format ??= "csg";
  return o;
}
