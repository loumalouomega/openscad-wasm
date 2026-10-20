#!/usr/bin/env bash
#
# Native (no-docker) port of DSchroer/openscad-wasm Dockerfile.base dependency
# stages, trimmed for a Manifold-only build (ENABLE_CGAL=OFF):
#   zlib, libffi, glib, libexpat, libxml2, freetype, harfbuzz, fontconfig,
#   eigen, double-conversion, libzip, boost (filesystem, program_options,
#   regex, system)
#
# Skipped vs the full recipe: cgal, gmp, mpfr (CGAL only), lib3mf and cairo
# (both optional in upstream CMake — 3MF degrades to dummy stubs, Cairo to
# "disabled (not found)").
#
# Everything installs into the Emscripten sysroot, exactly like the docker
# recipe, so upstream's CMake finds it with no extra prefix plumbing.
# Pinned refs mirror DSchroer/openscad-wasm's Makefile (proven set), except
# where noted.
#
# Host prerequisites (Debian/Ubuntu): autoconf autoconf-archive automake
# autopoint bison flex gettext gperf libltdl-dev libtool ninja-build meson
# pkg-config texinfo. `libltdl-dev` ships ltdl.m4 (LT_SYS_SYMBOL_USCORE),
# which libffi's autogen.sh needs.
#
# Usage:
#   source ~/emsdk-6.0.5/emsdk_env.sh   # emcc, emcmake, ... on PATH
#   export PATH="$HOME/.local/bin:$PATH"  # gperf etc, if built locally
#   scripts/build-deps.sh                # resumable; stages stamp .done files
#
set -euo pipefail

: "${EMSDK:?source emsdk_env.sh first (EMSDK must be set)}"
command -v emcc >/dev/null || { echo "emcc not on PATH"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/third-party/src"
BUILD="$ROOT/third-party/build"
SYSROOT="$EMSDK/upstream/emscripten/cache/sysroot"
JOBS="$(nproc)"
export CFLAGS="${CFLAGS:--fexceptions}"
export CXXFLAGS="${CXXFLAGS:--fexceptions}"
export LDFLAGS="${LDFLAGS:--fexceptions}"

mkdir -p "$SRC" "$BUILD"
touch_done() { touch "$BUILD/.done-$1"; }
is_done() { test -f "$BUILD/.done-$1"; }

clone_at() { # name repo ref
  local dest="$SRC/$1"
  if [ ! -d "$dest" ]; then
    echo "--- cloning $1 @ $3"
    mkdir -p "$dest"
    git -C "$dest" init -q
    git -C "$dest" remote add origin "$2" 2>/dev/null || git -C "$dest" remote set-url origin "$2"
    git -C "$dest" fetch --depth 1 origin "$3"
    git -C "$dest" checkout --detach FETCH_HEAD
    if [ -f "$dest/.gitmodules" ]; then
      git -C "$dest" submodule update -q --init --recursive --depth 1
    fi
  else
    echo "--- $1 already fetched"
  fi
}

sha256_of() { # file
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

fetch_tar() { # name sha256 url [fallback-url...]
  local dest="$SRC/$1" name="$1" sha="$2"
  shift 2
  if [ -d "$dest" ]; then
    echo "--- $name already fetched"
    return
  fi

  echo "--- fetching $name"
  mkdir -p "$ROOT/third-party/dl"
  local tar="$ROOT/third-party/dl/$name.tar.xz"
  local tmp="$tar.part"
  local ok=0
  local url

  # A previous run may have cached a partial archive (CI saves the cache even
  # when the build fails); never trust an existing file without its checksum.
  if [ -f "$tar" ] && [ "$(sha256_of "$tar")" = "$sha" ]; then
    ok=1
  else
    rm -f "$tar"
  fi

  if [ "$ok" -eq 0 ]; then
    for url in "$@"; do
      echo "--- downloading $url"
      # Bound each attempt: gmplib.org in particular can black-hole CI runners
      # for minutes per retry. Partial files are removed before the next mirror.
      if wget -nv --timeout=30 --tries=3 --waitretry=2 -O "$tmp" "$url" &&
         [ "$(sha256_of "$tmp")" = "$sha" ]; then
        mv "$tmp" "$tar"
        ok=1
        break
      fi
      echo "--- download failed, trying next mirror" >&2
      rm -f "$tmp"
    done
  fi

  if [ "$ok" -ne 1 ]; then
    echo "ERROR: could not download $name (checksum $sha) from any mirror" >&2
    return 1
  fi

  mkdir -p "$dest"
  tar xf "$tar" -C "$dest" --strip-components=1
}

echo "sysroot: $SYSROOT"
echo "jobs: $JOBS"

# ---- zlib (libzip, fontconfig, glib) ----
if ! is_done zlib; then
  clone_at zlib https://github.com/madler/zlib.git v1.3.2
  ( cd "$SRC/zlib" && emcmake cmake -B "$BUILD/zlib" \
      -DINSTALL_PKGCONFIG_DIR="$SYSROOT/lib/pkgconfig/" \
      -DZLIB_BUILD_SHARED=OFF -DZLIB_BUILD_STATIC=ON -DZLIB_BUILD_TESTING=OFF \
      -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/zlib" -j"$JOBS" && cmake --install "$BUILD/zlib" )
  touch_done zlib
fi

# ---- libexpat (fontconfig) ----
if ! is_done libexpat; then
  clone_at libexpat https://github.com/libexpat/libexpat.git R_2_8_2
  ( cd "$SRC/libexpat/expat" && ./buildconf.sh &&
    emconfigure ./configure --without-docbook --host wasm32-unknown-linux \
      --prefix="$SYSROOT" --enable-shared=no --disable-dependency-tracking &&
    emmake make -j"$JOBS" && emmake make install )
  touch_done libexpat
fi

# ---- libffi (glib) ----
if ! is_done libffi; then
  clone_at libffi https://github.com/libffi/libffi.git v3.7.1
  ( cd "$SRC/libffi" && ./autogen.sh &&
    emconfigure ./configure --host wasm32-unknown-linux --prefix="$SYSROOT" \
      --enable-static --disable-shared --disable-dependency-tracking \
      --disable-builddir --disable-multi-os-directory --disable-raw-api --disable-docs &&
    emmake make -j"$JOBS" && emmake make install SUBDIRS='include' &&
    emmake make install )
  touch_done libffi
fi

# ---- glib (fontconfig) ----
if ! is_done glib; then
  clone_at glib https://github.com/kleisauke/glib.git 3994b22020c9f61121ebbc902f19cfe906dd745b
  ( cd "$SRC/glib" && meson setup "$BUILD/glib" \
      --prefix="$SYSROOT" \
      --cross-file="$ROOT/third-party/emscripten-crossfile.meson" \
      --default-library=static --buildtype=release \
      --force-fallback-for=pcre2,gvdb \
      -Dselinux=disabled -Dxattr=false -Dlibmount=disabled -Dnls=disabled \
      -Dtests=false -Dglib_assert=false -Dglib_checks=false \
    && meson install -C "$BUILD/glib" )
  touch_done glib
fi

# ---- freetype (harfbuzz, fontconfig) ----
if ! is_done freetype; then
  clone_at freetype https://github.com/freetype/freetype.git VER-2-14-3
  ( cd "$SRC/freetype" && emcmake cmake -B "$BUILD/freetype" \
      -DFT_REQUIRE_ZLIB=TRUE -DDISABLE_FORCE_DEBUG_POSTFIX=TRUE \
      -DBUILD_SHARED_LIBS=OFF -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/freetype" -j"$JOBS" && cmake --install "$BUILD/freetype" )
  touch_done freetype
fi

# ---- libxml2 (fontconfig) ----
if ! is_done libxml2; then
  clone_at libxml2 https://gitlab.gnome.org/GNOME/libxml2.git v2.15.3
  ( cd "$SRC/libxml2" && emcmake cmake -B "$BUILD/libxml2" -G Ninja \
      -DBUILD_SHARED_LIBS=OFF -DLIBXML2_WITH_PYTHON=OFF -DLIBXML2_WITH_LZMA=OFF \
      -DLIBXML2_WITH_ZLIB=OFF -DLIBXML2_WITH_TESTS=OFF -DLIBXML2_WITH_PROGRAMS=OFF \
      -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/libxml2" -j"$JOBS" && cmake --install "$BUILD/libxml2" )
  touch_done libxml2
fi

# ---- fontconfig ----
if ! is_done fontconfig; then
  clone_at fontconfig https://gitlab.freedesktop.org/fontconfig/fontconfig.git 2.18.2
  ( cd "$SRC/fontconfig" &&
    export FREETYPE_CFLAGS="-I$SYSROOT/include/freetype2" &&
    export FREETYPE_LIBS="-lfreetype -lz" &&
    # va_copy probe tries to RUN a test binary — hard error under cross.
    # Emscripten is C99 va_copy-clean, so pre-seed the cache.
    export ac_cv_va_copy=C99 &&
    emconfigure ./autogen.sh --host none --disable-docs --disable-shared \
      --enable-static --disable-cache-build --sysconfdir="$SYSROOT" --localstatedir="$SYSROOT" \
      --with-default-fonts=/fonts --enable-libxml2 --prefix="$SYSROOT" &&
    emmake make -j"$JOBS" && emmake make install )
  touch_done fontconfig
fi

# ---- harfbuzz ----
if ! is_done harfbuzz; then
  clone_at harfbuzz https://github.com/harfbuzz/harfbuzz.git 14.3.0
  ( cd "$SRC/harfbuzz" && emcmake cmake -B "$BUILD/harfbuzz" -G Ninja \
      -DHB_HAVE_FREETYPE=ON -DBUILD_SHARED_LIBS=OFF -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/harfbuzz" -j"$JOBS" && cmake --install "$BUILD/harfbuzz" )
  touch_done harfbuzz
fi

# ---- eigen (header-only) ----
if ! is_done eigen; then
  clone_at eigen https://gitlab.com/libeigen/eigen.git 5.0.1
  ( cd "$SRC/eigen" && emcmake cmake -B "$BUILD/eigen" -G Ninja \
      -DCMAKE_INSTALL_PREFIX="$SYSROOT" -DCMAKE_BUILD_TYPE=Release \
      -DBUILD_TESTING=OFF -DEIGEN_BUILD_TESTING=OFF -DEIGEN_BUILD_BLAS=OFF \
      -DEIGEN_BUILD_LAPACK=OFF -DEIGEN_BUILD_DOC=OFF -DEIGEN_BUILD_DEMOS=OFF \
    && cmake --build "$BUILD/eigen" -j"$JOBS" && cmake --install "$BUILD/eigen" )
  ln -sfn "$SYSROOT/include/eigen3/Eigen" "$SYSROOT/include/Eigen"
  touch_done eigen
fi

# ---- double-conversion ----
if ! is_done doubleconversion; then
  clone_at doubleconversion https://github.com/google/double-conversion.git v3.4.0
  ( cd "$SRC/doubleconversion" && emcmake cmake -B "$BUILD/doubleconversion" -G Ninja \
      -DBUILD_SHARED_LIBS=OFF -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/doubleconversion" -j"$JOBS" && cmake --install "$BUILD/doubleconversion" )
  touch_done doubleconversion
fi

# ---- libzip ----
if ! is_done libzip; then
  clone_at libzip https://github.com/nih-at/libzip.git v1.11.4
  ( cd "$SRC/libzip" && emcmake cmake -B "$BUILD/libzip" -G Ninja \
      -DBUILD_OSSFUZZ=OFF -DBUILD_EXAMPLES=OFF -DBUILD_TOOLS=OFF -DBUILD_SHARED_LIBS=OFF \
      -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/libzip" -j"$JOBS" && cmake --install "$BUILD/libzip" )
  touch_done libzip
fi

# ---- lib3mf (3MF import/export; upstream falls back to dummy stubs without it) ----
if ! is_done lib3mf; then
  clone_at lib3mf https://github.com/3MFConsortium/lib3mf.git v2.3.2
  ( cd "$SRC/lib3mf" && git apply "$ROOT/third-party/patches/lib3mf.patch" ) || true
  ( cd "$SRC/lib3mf" &&
    LDFLAGS="$LDFLAGS -L$SYSROOT/lib" emcmake cmake -B "$BUILD/lib3mf" -G Ninja \
      -DLIB3MF_TESTS=OFF -DUSE_INCLUDED_ZLIB=OFF -DUSE_INCLUDED_LIBZIP=OFF \
      -DBUILD_SHARED_LIBS=OFF -DSTRIP_BINARIES=OFF \
      -DCMAKE_POLICY_VERSION_MINIMUM=3.5 -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/lib3mf" -j"$JOBS" && cmake --install "$BUILD/lib3mf" )
  touch_done lib3mf
fi

# ---- gmp (CGAL) ----
if ! is_done gmp; then
  fetch_tar gmp a3c2b80201b89e68616f4ad30bc66aee4927c3ce50e33929ca819d5c43538898 \
    https://ftpmirror.gnu.org/gmp/gmp-6.3.0.tar.xz \
    https://ftp.gnu.org/gnu/gmp/gmp-6.3.0.tar.xz \
    https://mirrors.kernel.org/gnu/gmp/gmp-6.3.0.tar.xz \
    https://gmplib.org/download/gmp/gmp-6.3.0.tar.xz
  ( cd "$SRC/gmp" &&
    emconfigure ./configure --disable-assembly --host none --enable-cxx \
      --prefix="$SYSROOT" HOST_CC=gcc &&
    emmake make -j"$JOBS" && emmake make install )
  touch_done gmp
fi

# ---- mpfr (CGAL) ----
if ! is_done mpfr; then
  fetch_tar mpfr 277807353a6726978996945af13e52829e3abd7a9a5b7fb2793894e18f1fcbb2 \
    https://ftpmirror.gnu.org/mpfr/mpfr-4.2.1.tar.xz \
    https://ftp.gnu.org/gnu/mpfr/mpfr-4.2.1.tar.xz \
    https://www.mpfr.org/mpfr-4.2.1/mpfr-4.2.1.tar.xz
  ( cd "$SRC/mpfr" &&
    emconfigure ./configure --host none --with-gmp="$SYSROOT" \
      --prefix="$SYSROOT" &&
    emmake make -j"$JOBS" && emmake make install )
  touch_done mpfr
fi

# ---- CGAL (required: manifold/*.cc includes CGAL headers even with
# ENABLE_CGAL=OFF at this snapshot — Manifold-only does not compile) ----
if ! is_done cgal; then
  clone_at cgal https://github.com/CGAL/cgal.git v6.0.3
  ( cd "$SRC/cgal" && emcmake cmake -B "$BUILD/cgal" -G Ninja \
      -DBUILD_SHARED_LIBS=OFF -DCMAKE_BUILD_TYPE=Release \
    && cmake --build "$BUILD/cgal" -j"$JOBS" && cmake --install "$BUILD/cgal" )
  touch_done cgal
fi

# ---- boost (regex, program_options, filesystem, system) ----
if ! is_done boost; then
  fetch_tar boost 3abd7a51118a5dd74673b25e0a3f0a4ab1752d8d618f4b8cea84a603aeecc680 \
    https://github.com/boostorg/boost/releases/download/boost-1.87.0/boost-1.87.0-b2-nodocs.tar.xz
  ( cd "$SRC/boost" &&
    sed -i -E 's/-fwasm-exceptions/-fexceptions/g' tools/build/src/tools/emscripten.jam &&
    ./bootstrap.sh &&
    ./b2 --disable-icu --prefix="$SYSROOT" \
      --with-filesystem --with-program_options --with-regex --with-system \
      address-model=32 \
      cxxflags="-std=c++17 -stdlib=libc++ -fexceptions" \
      install link=static linkflags="-stdlib=libc++ -fexceptions" \
      release runtime-link=static toolset=emscripten -j"$JOBS" )
  touch_done boost
fi

echo "ALL DEPS DONE"
