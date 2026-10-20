// Pure (wasm-free) helpers shared by the wrapper, the CLI and the unit tests:
// format table, argv construction, diagnostics parsing, STL parsing and
// Customizer parameter extraction. Nothing here touches the filesystem or the
// WebAssembly module, so it runs (and is tested) without a built dist/.

/**
 * Export formats this build can produce. `ext` is the MEMFS output extension,
 * `exportFormat` the value for `--export-format` (selects binary vs ascii STL),
 * `binary` whether the result is bytes rather than UTF-8 text.
 *
 * PNG and PDF are intentionally absent: upstream's Emscripten block forces
 * NULLGL=ON (no OpenGL, so no image rendering) and ENABLE_CAIRO=OFF (no PDF).
 */
export const FORMATS = {
  csg: { ext: "csg", binary: false },
  stl: { ext: "stl", exportFormat: "binstl", binary: true },
  binstl: { ext: "stl", exportFormat: "binstl", binary: true },
  asciistl: { ext: "stl", exportFormat: "asciistl", binary: false },
  obj: { ext: "obj", binary: false },
  off: { ext: "off", binary: false },
  wrl: { ext: "wrl", binary: false },
  "3mf": { ext: "3mf", binary: true },
  dxf: { ext: "dxf", binary: false },
  svg: { ext: "svg", binary: false },
  pov: { ext: "pov", binary: false },
  echo: { ext: "echo", binary: false },
  ast: { ext: "ast", binary: false },
  term: { ext: "term", binary: false },
  param: { ext: "param", binary: false },
  nef3: { ext: "nef3", binary: false },
};

export function getFormat(name) {
  const key = String(name ?? "csg").toLowerCase();
  const fmt = FORMATS[key];
  if (!fmt) {
    throw new TypeError(
      `Unsupported format "${name}". Supported: ${Object.keys(FORMATS).join(", ")}` +
        " (png and pdf are not available in the WebAssembly build)",
    );
  }
  return { name: key, ...fmt };
}

const BACKENDS = new Set(["manifold", "cgal"]);

/**
 * Build the argv (after the program name) for one render.
 * Pure: returns `{ args, inPath, outPath, summaryPath, paramPath, format }`.
 */
export function buildArgs(options = {}) {
  const {
    format = "csg",
    backend = "manifold",
    defines = {},
    enable = [],
    parameterSet,
    parameters,
    summary,
    colorscheme,
    hardwarnings = false,
    quiet = false,
    exportOptions = {},
    args: extra = [],
  } = options;

  const fmt = getFormat(format);
  if (!BACKENDS.has(String(backend).toLowerCase())) {
    throw new TypeError(`Unsupported backend "${backend}" (manifold | cgal)`);
  }
  const inPath = "/in.scad";
  const outPath = `/o.${fmt.ext}`;
  const args = [`--backend=${String(backend).toLowerCase()}`];

  if (fmt.exportFormat) args.push(`--export-format=${fmt.exportFormat}`);
  for (const [k, v] of Object.entries(defines)) args.push("-D", `${k}=${formatDefine(v)}`);
  const features = Array.isArray(enable) ? enable : [enable];
  for (const f of features.filter(Boolean)) args.push(`--enable=${f}`);
  for (const [k, v] of Object.entries(exportOptions)) args.push("-O", `${k}=${v}`);
  if (colorscheme) args.push(`--colorscheme=${colorscheme}`);
  if (hardwarnings) args.push("--hardwarnings");
  if (quiet) args.push("--quiet");

  let paramPath;
  if (parameters && parameterSet) {
    paramPath = "/p.json";
    args.push("-p", paramPath, "-P", parameterSet);
  } else if (parameters || parameterSet) {
    throw new TypeError("`parameters` (a Customizer JSON) and `parameterSet` (a set name) must be given together");
  }

  let summaryPath;
  if (summary) {
    summaryPath = "/s.json";
    const list = summary === true ? ["all"] : Array.isArray(summary) ? summary : [summary];
    for (const s of list) args.push("--summary", s);
    args.push("--summary-file", summaryPath);
  }

  args.push(...extra, inPath, "-o", outPath);
  return { args, inPath, outPath, summaryPath, paramPath, format: fmt };
}

/** Render a JS value as an OpenSCAD `-D` right-hand side. */
export function formatDefine(v) {
  // Strings that already are an OpenSCAD literal (number, bool, undef, vector,
  // quoted string) pass through; anything else becomes a quoted string.
  if (typeof v === "string") {
    return /^(".*"|[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?|true|false|undef|\[.*\])$/is.test(v.trim())
      ? v.trim()
      : JSON.stringify(v);
  }
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return JSON.stringify(v);
  return String(v);
}

/**
 * Split OpenSCAD's log lines into categories.
 * @param {string[]} lines
 */
export function parseDiagnostics(lines) {
  const out = { warnings: [], errors: [], echo: [], deprecations: [], other: [] };
  for (const raw of lines) {
    const line = String(raw);
    let m;
    if ((m = /^WARNING:\s*(.*)$/.exec(line))) out.warnings.push(m[1]);
    else if ((m = /^ERROR:\s*(.*)$/.exec(line))) out.errors.push(m[1]);
    else if ((m = /^ECHO:\s*(.*)$/.exec(line))) out.echo.push(m[1]);
    else if ((m = /^DEPRECATED:\s*(.*)$/.exec(line))) out.deprecations.push(m[1]);
    else out.other.push(line);
  }
  return out;
}

/** Parse a binary STL into a flat, non-indexed `Float32Array` of xyz triples. */
export function parseBinaryStl(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 84) throw new RangeError("STL too short");
  const count = view.getUint32(80, true);
  if (bytes.byteLength < 84 + count * 50) throw new RangeError("STL truncated");
  const positions = new Float32Array(count * 9);
  let o = 84;
  for (let t = 0; t < count; t++) {
    o += 12; // skip normal
    for (let i = 0; i < 9; i++, o += 4) positions[t * 9 + i] = view.getFloat32(o, true);
    o += 2; // attribute byte count
  }
  return positions;
}

/** Weld identical vertices: `{ positions, indices }` (indexed triangle mesh). */
export function indexMesh(flat) {
  const seen = new Map();
  const positions = [];
  const indices = new Uint32Array(flat.length / 3);
  const f32 = new Float32Array(1);
  const u32 = new Uint32Array(f32.buffer);
  const bits = (x) => ((f32[0] = x), u32[0]);
  for (let i = 0; i < flat.length / 3; i++) {
    const x = flat[i * 3], y = flat[i * 3 + 1], z = flat[i * 3 + 2];
    const key = `${bits(x)},${bits(y)},${bits(z)}`;
    let idx = seen.get(key);
    if (idx === undefined) {
      idx = positions.length / 3;
      positions.push(x, y, z);
      seen.set(key, idx);
    }
    indices[i] = idx;
  }
  return { positions: new Float32Array(positions), indices };
}

/** Binary STL bytes -> `{ positions: Float32Array, indices: Uint32Array }`. */
export function stlToMesh(bytes) {
  return indexMesh(parseBinaryStl(bytes));
}

/** `include <a/b.scad>` / `use <c.scad>` targets referenced by a source text. */
export function findIncludes(scad) {
  const re = /^\s*(?:include|use)\s*<([^>]+)>/gm;
  const found = [];
  let m;
  while ((m = re.exec(scad))) found.push(m[1].trim());
  return found;
}

function parseLiteral(text) {
  const t = text.trim();
  if (/^(true|false)$/.test(t)) return t === "true";
  if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return Number(t);
  const s = /^"((?:[^"\\]|\\.)*)"$/.exec(t);
  if (s) return s[1];
  if (t.startsWith("[")) {
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  }
  return t;
}

function parseAnnotation(text) {
  const m = /^\[(.*)\]$/.exec(text.trim());
  if (!m) return null;
  const body = m[1].trim();
  if (/^[-+\d.eE]+(:[-+\d.eE]+){1,2}$/.test(body)) {
    const p = body.split(":").map(Number);
    return p.length === 2 ? { min: p[0], max: p[1] } : { min: p[0], step: p[1], max: p[2] };
  }
  if (/^[-+\d.eE]+$/.test(body)) return { max: Number(body) };
  const options = body.split(",").map((o) => {
    const [value, label] = o.split(":");
    const v = parseLiteral(value);
    return label === undefined ? { value: v } : { value: v, label: label.trim() };
  });
  return { options };
}

/**
 * Heuristic Customizer parameter extraction. Reads top-level
 * `name = value; // [annotation]` assignments before the first module/function,
 * with `/* [Group] *\/` headings and a preceding `// description` line. The
 * `[Hidden]` group is skipped. This mirrors what OpenSCAD's GUI shows, but is
 * not a full parser.
 */
export function extractParameters(scad) {
  const params = [];
  let group = "Parameters";
  let hidden = false;
  let description = "";
  for (const line of String(scad).split(/\r?\n/)) {
    if (/^\s*(module|function)\b/.test(line)) break;
    const g = /^\s*\/\*\s*\[([^\]]*)\]\s*\*\/\s*$/.exec(line);
    if (g) {
      group = g[1].trim();
      hidden = group.toLowerCase() === "hidden";
      description = "";
      continue;
    }
    const d = /^\s*\/\/\s*(.*)$/.exec(line);
    if (d) {
      description = d[1].trim();
      continue;
    }
    const a = /^\s*([A-Za-z_]\w*)\s*=\s*([^;]+);\s*(?:\/\/\s*(.*))?$/.exec(line);
    if (a) {
      if (!hidden) {
        const p = { name: a[1], value: parseLiteral(a[2]), group, description };
        if (a[3]) {
          const ann = parseAnnotation(a[3]);
          if (ann) Object.assign(p, ann);
        }
        params.push(p);
      }
      description = "";
      continue;
    }
    if (line.trim() !== "") description = "";
  }
  return params;
}

export class ScadWasmError extends Error {
  constructor(message, { rc, stderr, diagnostics } = {}) {
    super(message);
    this.name = "ScadWasmError";
    this.rc = rc;
    this.stderr = stderr ?? [];
    this.diagnostics = diagnostics ?? parseDiagnostics(this.stderr);
  }
}

export class ScadTimeoutError extends Error {
  constructor(timeoutMs) {
    super(`OpenSCAD render exceeded ${timeoutMs} ms`);
    this.name = "ScadTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Abort classifier: Emscripten aborts surface as RuntimeErrors; C++ exceptions
 * escaping callMain surface as bare-digit exception pointers.
 */
export function isOpenScadWasmAbort(message) {
  const text = String((message && message.message) || message || "");
  return (
    /out of bounds|abort|RuntimeError|unreachable|null function|table index|function table|funcref table|wasmtable|signature mismatch/i.test(
      text,
    ) || /^\d+$/.test(text.trim())
  );
}
