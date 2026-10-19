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

# Upstream deltas carried as patches (DSchroer-style), applied idempotently:
# - openscad-emsdk-sysroot.patch: $EMSDK instead of hardcoded docker /emsdk.
# - openscad-wasm-memfs.patch: OPENSCAD_WASM_MEMFS_ONLY knob to drop
#   -sNODERAWFS (pure-MEMFS root for bytes-in/bytes-out API use).
for patch in openscad-emsdk-sysroot.patch openscad-wasm-memfs.patch; do
  if git -C "$ROOT/openscad" apply --check "$ROOT/third-party/patches/$patch" >/dev/null 2>&1; then
    git -C "$ROOT/openscad" apply "$ROOT/third-party/patches/$patch"
    echo "applied $patch"
  elif git -C "$ROOT/openscad" diff --quiet -- CMakeLists.txt; then
    echo "$patch already applied"
  else
    echo "WARNING: openscad/CMakeLists.txt has local modifications; not applying $patch"
  fi
done

# Version metadata the way upstream CI derives it: openscad_version.cmake wants
# YYYY.MM[.DD][-PPP][.build] (plain `git describe` output does NOT match, it
# fails the math() parse), so use today's date like the in-tree default.
OPENSCAD_COMMIT="$(git -C "$ROOT/openscad" rev-parse --short HEAD)"
OPENSCAD_VERSION="$(date +%Y.%m.%d)"
echo "commit: $OPENSCAD_COMMIT  version: $OPENSCAD_VERSION"

emcmake cmake -G Ninja -S "$ROOT/openscad" -B "$BLD" \
  -DCMAKE_BUILD_TYPE=OpenscadWasm \
  -DCMAKE_C_FLAGS_OPENCADWASM="-O3 -DNDEBUG" \
  -DCMAKE_CXX_FLAGS_OPENCADWASM="-O3 -DNDEBUG" \
  -DCMAKE_EXE_LINKER_FLAGS_OPENCADWASM="" \
  -DWASM_BUILD_TYPE=node-module \
  -DOPENSCAD_WASM_MEMFS_ONLY=ON \
  -DENABLE_CGAL=ON \
  -DENABLE_TESTS=OFF \
  -DOPENSCAD_COMMIT="$OPENSCAD_COMMIT" \
  -DOPENSCAD_VERSION="$OPENSCAD_VERSION" \
  -DSNAPSHOT=ON \
  -DEXPERIMENTAL=ON
# NOTE: a custom build type (not Release) is deliberate: upstream adds
# -sSINGLE_FILE only for CONFIG:Release, which would inline the .wasm as
# base64 into the .js. This package ships the .wasm as a separate,
# separately-replaceable asset (gmsh-wasm dist/gmsh-core.wasm precedent,
# LGPL §4 layout), so single-file is off and -O3 -DNDEBUG are set explicitly.

cmake --build "$BLD" -j"$JOBS"
ls -la "$BLD/openscad.js" "$BLD/openscad.wasm"
