#!/usr/bin/env bash
#
# Configure + build OpenSCAD for Node as an ES module (WASM_BUILD_TYPE=node-module):
#   -sENVIRONMENT=node,worker -sEXPORT_ES6=1 -sEXPORT_NAME=OpenSCAD -sMODULARIZE=1
# Manifold-only geometry backend (ENABLE_CGAL=OFF) for the first probe build.
#
# Usage:
#   source ~/emsdk-6.0.5/emsdk_env.sh
#   scripts/build-wasm.sh [build-dir]   # default: build-node-module
#
set -euo pipefail

: "${EMSDK:?source emsdk_env.sh first (EMSDK must be set)}"
command -v emcc >/dev/null || { echo "emcc not on PATH"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLD="${1:-$ROOT/build-node-module}"
JOBS="$(nproc)"

# Version metadata the way upstream CI derives it.
OPENSCAD_COMMIT="$(git -C "$ROOT/openscad" rev-parse --short HEAD)"
OPENSCAD_VERSION="$(git -C "$ROOT/openscad" describe --tags 2>/dev/null || echo "unknown")"
echo "commit: $OPENSCAD_COMMIT  version: $OPENSCAD_VERSION"

emcmake cmake -G Ninja -S "$ROOT/openscad" -B "$BLD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DWASM_BUILD_TYPE=node-module \
  -DENABLE_CGAL=OFF \
  -DOPENSCAD_COMMIT="$OPENSCAD_COMMIT" \
  -DOPENSCAD_VERSION="$OPENSCAD_VERSION" \
  -DSNAPSHOT=ON \
  -DEXPERIMENTAL=ON

cmake --build "$BLD" -j"$JOBS"
ls -la "$BLD/openscad.js" "$BLD/openscad.wasm"
