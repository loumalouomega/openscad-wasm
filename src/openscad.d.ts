export interface InitOptions {
  noInitialRun?: boolean;
  print?: (...args: unknown[]) => void;
  printErr?: (...args: unknown[]) => void;
  /** Captured stdout/stderr lines (in order). Overrides print/printErr. */
  collect?: string[];
  /** Raw bytes of openscad-core.wasm; read from the package when omitted. */
  wasmBinary?: Uint8Array;
  /** Path to openscad-core.wasm; read when wasmBinary is omitted. */
  wasmPath?: string;
}

export interface EmscriptenFS {
  writeFile(path: string, data: string | ArrayBufferView): void;
  readFile(path: string, opts: { encoding: "utf8" }): string;
  readFile(path: string, opts?: { encoding: "binary" }): Uint8Array;
  unlink(path: string): void;
}

export interface OpenSCADInstance {
  callMain(args: string[]): number;
  FS: EmscriptenFS;
}

export declare function getWasmBinary(wasmPath?: string): Buffer;
export declare function initOpenSCAD(options?: InitOptions): Promise<OpenSCADInstance>;

export declare function isOpenScadWasmAbort(message: unknown): boolean;

export interface EvaluateOptions {
  files?: Record<string, string>;
  args?: string[];
  outPath?: string;
}

export interface EvaluateResult {
  rc: number;
  output: string;
  stderr: string[];
}

export declare function evaluateScad(
  instance: OpenSCADInstance,
  opts: EvaluateOptions,
): Promise<EvaluateResult>;

export declare class ScadWasmError extends Error {
  rc?: number;
  stderr: string[];
}

export interface RenderOptions {
  defines?: Record<string, string | number>;
  backend?: "manifold" | "cgal";
  extraFiles?: Record<string, string>;
  wasmBinary?: Uint8Array;
  wasmPath?: string;
}

export declare function renderToCsg(scadText: string, options?: RenderOptions): Promise<string>;
