# Building from source

Only needed to change build flags, bump OpenSCAD or develop the package. A full build takes hours and several GB of disk.

## Prerequisites

Debian/Ubuntu host packages:

```bash
sudo apt-get install -y autoconf autoconf-archive automake autopoint bison \
  build-essential ccache flex gettext git gperf libltdl-dev libtool \
  ninja-build pkg-config python3-pip texinfo unzip wget
pip install --user --break-system-packages meson
```

::: warning libltdl-dev
libffi's `autogen.sh` fails with `possibly undefined macro: LT_SYS_SYMBOL_USCORE` without `libltdl-dev` (it provides `ltdl.m4`).
:::

## Steps

```bash
git submodule update --init --recursive
git clone --depth 1 --branch 6.0.5 https://github.com/emscripten-core/emsdk.git ~/emsdk-6.0.5
~/emsdk-6.0.5/emsdk install 6.0.5 && ~/emsdk-6.0.5/emsdk activate 6.0.5
source ~/emsdk-6.0.5/emsdk_env.sh

scripts/build-deps.sh    # zlib … boost into the emsdk sysroot (resumable)
scripts/build-wasm.sh    # → build-node-module/openscad.{js,wasm}
scripts/stage-dist.sh    # → dist/
npm test
```

| Script | Does |
| --- | --- |
| `scripts/build-deps.sh` | Native port of DSchroer/openscad-wasm `Dockerfile.base` with pinned refs; stamps `.done-*` files so reruns resume |
| `scripts/build-wasm.sh` | Applies patches, configures with `emcmake`/Ninja (`WASM_BUILD_TYPE=node-module`), builds |
| `scripts/stage-dist.sh` | Copies glue + wasm + the hand-written wrapper into `dist/` |

## Build options

| Variable | Effect |
| --- | --- |
| `OPENSCAD_WASM_OPT=-Oz` | optimisation level for `build-wasm.sh` (`-O3` default; `-Os`/`-Oz` for a smaller wasm) |

The build always sets `OPENSCAD_WASM_MEMFS_ONLY=ON` (pure MEMFS root, `ENVIRONMENT=node,web,worker`). Upstream's Emscripten block hard-codes `ENABLE_CAIRO=OFF`, `NULLGL=ON` and `MANIFOLD_PAR=OFF`, so PDF, PNG and threading are not available without patching upstream.

## CI

`.github/workflows/ci.yml` runs fast checks (syntax, unit and docs-snippet tests, docs/API drift check, patch applicability), then the full build + tests, and publishes to npm on `v*` tags. A newer push to the same ref cancels the older run; tag builds are never cancelled.

**Dependency cache.** The dependency stages (`third-party/src`, `third-party/build`, the emsdk sysroot) are restored with `actions/cache/restore` using a key made of the hash of `scripts/build-deps.sh` and the lib3mf patch plus the run id, falling back to the newest cache with the same hash prefix. They are saved with `actions/cache/save` under `if: always()`, so a failure in a later step (for example the OpenSCAD link) still keeps the finished dependency stages. `build-deps.sh` stamps each stage with `.done-*` and resumes from there. Changing `build-deps.sh` changes the hash prefix and starts clean.
