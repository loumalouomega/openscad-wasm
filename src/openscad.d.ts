export type Format =
  | "csg" | "stl" | "binstl" | "asciistl" | "obj" | "off" | "wrl" | "3mf"
  | "dxf" | "svg" | "pov" | "echo" | "ast" | "term" | "param" | "nef3";

export interface FormatInfo {
  ext: string;
  exportFormat?: string;
  binary: boolean;
}
export declare const FORMATS: Record<Format, FormatInfo>;
export declare function getFormat(name?: string): FormatInfo & { name: string };

export interface InitOptions {
  noInitialRun?: boolean;
  print?: (...args: unknown[]) => void;
  printErr?: (...args: unknown[]) => void;
  /** Captured stdout/stderr lines (in order). Nothing is echoed when set. */
  collect?: string[];
  /** Library sources (path -> contents) mounted at /libraries (OPENSCADPATH). */
  libraries?: Record<string, string | Uint8Array>;
  /** Font files (file name -> bytes) so text() works in evaluated geometry. */
  fonts?: Record<string, Uint8Array>;
  /** Raw bytes of openscad-core.wasm. */
  wasmBinary?: Uint8Array;
  /** Node: path to openscad-core.wasm. */
  wasmPath?: string;
  /** Browser: URL to fetch openscad-core.wasm from. */
  wasmUrl?: string | URL;
}

export interface EmscriptenFS {
  writeFile(path: string, data: string | ArrayBufferView): void;
  readFile(path: string, opts: { encoding: "utf8" }): string;
  readFile(path: string, opts?: { encoding: "binary" }): Uint8Array;
  unlink(path: string): void;
  mkdirTree(path: string): void;
  readdir(path: string): string[];
}

export interface OpenSCADInstance {
  callMain(args: string[]): number;
  FS: EmscriptenFS;
  ENV: Record<string, string>;
}

export declare const LIBRARY_ROOT: "/libraries";
export declare const FONT_ROOT: "/fonts";

/** Node only (sync, cached). Use loadWasmBinary() for portable code. */
export declare function getWasmBinary(wasmPath?: string): Uint8Array;
export declare function loadWasmBinary(opts?: { wasmPath?: string; wasmUrl?: string | URL }): Promise<Uint8Array>;
export declare function initOpenSCAD(options?: InitOptions): Promise<OpenSCADInstance>;
export declare function isOpenScadWasmAbort(message: unknown): boolean;

export declare function mountFiles(
  instance: Pick<OpenSCADInstance, "FS">,
  files: Record<string, string | Uint8Array>,
  root?: string,
): void;
export declare function mountLibrary(
  instance: Pick<OpenSCADInstance, "FS">,
  files: Record<string, string | Uint8Array>,
): void;

export interface EvaluateOptions {
  files?: Record<string, string | Uint8Array>;
  args?: string[];
  outPath?: string;
  /** Read outPath as bytes instead of UTF-8 text. */
  binary?: boolean;
}

export interface EvaluateResult {
  rc: number;
  output: string | Uint8Array;
  /** Log lines emitted during this call. */
  stderr: string[];
}

export declare function evaluateScad(instance: OpenSCADInstance, opts: EvaluateOptions): Promise<EvaluateResult>;

export interface Diagnostics {
  warnings: string[];
  errors: string[];
  echo: string[];
  deprecations: string[];
  other: string[];
}
export declare function parseDiagnostics(lines: string[]): Diagnostics;

export declare class ScadWasmError extends Error {
  rc?: number;
  stderr: string[];
  diagnostics: Diagnostics;
}
export declare class ScadTimeoutError extends Error {
  timeoutMs: number;
}

export type DefineValue = string | number | boolean | unknown[];

export interface RenderOptions {
  /** Output format (default "csg"). png and pdf are not available in this build. */
  format?: Format;
  defines?: Record<string, DefineValue>;
  backend?: "manifold" | "cgal";
  /** Experimental features, e.g. ["lazy-union", "roof"] (`--enable=`). */
  enable?: string[];
  /** Customizer parameter-set JSON and the name of the set to apply. */
  parameters?: object;
  parameterSet?: string;
  /** Collect render statistics: true = all, or a list (area, bounding-box, ...). */
  summary?: boolean | string[];
  colorscheme?: string;
  hardwarnings?: boolean;
  quiet?: boolean;
  /** Export settings, `-O section/key=value`. */
  exportOptions?: Record<string, string | number | boolean>;
  /** Extra raw argv placed before the input file. */
  args?: string[];
  extraFiles?: Record<string, string | Uint8Array>;
  libraries?: Record<string, string | Uint8Array>;
  fonts?: Record<string, Uint8Array>;
  /** Reuse an already-initialised instance instead of creating a fresh one. */
  instance?: OpenSCADInstance;
  wasmBinary?: Uint8Array;
  wasmPath?: string;
  wasmUrl?: string | URL;
}

export interface RenderResult<T = string | Uint8Array> {
  output: T;
  format: string;
  stderr: string[];
  diagnostics: Diagnostics;
  /** Present when `summary` was requested (OpenSCAD's --summary-file JSON). */
  summary?: Record<string, unknown>;
}

export declare function render(scadText: string, options?: RenderOptions): Promise<RenderResult>;
export declare function renderToCsg(scadText: string, options?: Omit<RenderOptions, "format">): Promise<string>;
export declare function renderToStl(scadText: string, options?: Omit<RenderOptions, "format">): Promise<Uint8Array>;

export interface IndexedMesh {
  positions: Float32Array;
  indices: Uint32Array;
}
export declare function renderToMesh(scadText: string, options?: Omit<RenderOptions, "format">): Promise<IndexedMesh>;
export declare function stlToMesh(bytes: Uint8Array): IndexedMesh;
export declare function parseBinaryStl(bytes: Uint8Array): Float32Array;
export declare function indexMesh(flat: Float32Array): IndexedMesh;

export interface Renderer {
  render(scadText: string, options?: RenderOptions): Promise<RenderResult>;
  dispose(): void;
}
export declare function createRenderer(options?: RenderOptions & { reuse?: boolean }): Renderer;

export interface BuiltArgs {
  args: string[];
  inPath: string;
  outPath: string;
  summaryPath?: string;
  paramPath?: string;
  format: FormatInfo & { name: string };
}
export declare function buildArgs(options?: RenderOptions): BuiltArgs;
export declare function formatDefine(v: DefineValue): string;
export declare function findIncludes(scad: string): string[];

export interface ScadParameter {
  name: string;
  value: string | number | boolean | unknown[];
  group: string;
  description: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: unknown; label?: string }[];
}
/** Heuristic Customizer parameter extraction (no wasm needed). */
export declare function extractParameters(scad: string): ScadParameter[];

// ---- "@loumalouomega/openscad-wasm/worker" ----
export declare function renderInWorker(
  scadText: string,
  options?: Omit<RenderOptions, "instance">,
  limits?: { timeoutMs?: number },
): Promise<RenderResult>;
