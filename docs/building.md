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

## CI

`.github/workflows/ci.yml` runs fast syntax/patch checks, then the full build + smoke test, and publishes to npm on `v*` tags. The dependency build is cached by the hash of `scripts/build-deps.sh`.
