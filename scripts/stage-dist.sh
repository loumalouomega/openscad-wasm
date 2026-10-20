#!/usr/bin/env bash
#
# Stage the publishable dist/ from the Emscripten build + hand-written wrapper:
#   dist/openscad-factory.mjs  <- build-node-module/openscad.js (ESM factory)
#   dist/openscad-core.wasm    <- build-node-module/openscad.wasm (separate asset)
#   dist/openscad.mjs/.cjs/.d.ts, core/cli/worker*.mjs <- src/ wrapper
#
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLD="${1:-$ROOT/build-node-module}"
DIST="$ROOT/dist"

for f in "$BLD/openscad.js" "$BLD/openscad.wasm"; do
  [ -f "$f" ] || { echo "missing $f (run scripts/build-wasm.sh first)"; exit 1; }
done

mkdir -p "$DIST"
cp "$BLD/openscad.js" "$DIST/openscad-factory.mjs"
cp "$BLD/openscad.wasm" "$DIST/openscad-core.wasm"
cp "$ROOT"/src/openscad.mjs "$ROOT"/src/openscad.cjs "$ROOT"/src/openscad.d.ts \
   "$ROOT"/src/core.mjs "$ROOT"/src/cli.mjs "$ROOT"/src/worker.mjs "$ROOT"/src/worker-entry.mjs "$DIST/"
ls -la "$DIST/"
