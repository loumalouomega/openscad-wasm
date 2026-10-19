# Third-party notices for @loumalouomega/openscad-wasm

Distributed `.wasm` statically links the following upstream components.
Exact pinned refs live in `scripts/build-deps.sh` (dependencies) and the
`openscad` submodule (main source). This file records versions once each
stage of the probe build completes.

## Main source

| Component | Ref | Licence |
| --- | --- | --- |
| OpenSCAD | submodule `openscad` @ `7bbf60383` (`openscad-2026.10-TEST4-2-g7bbf60383`) | GPL-2.0-or-later (`COPYING`, with the CGAL-link exception) |
| Manifold (bundled submodule `submodules/manifold`) | `0edd9d5` (as pinned by the OpenSCAD submodule) | Apache-2.0 |
| Clipper2 (bundled submodule) | `c7f820f` (as pinned by the OpenSCAD submodule) | Boost Software License 1.0 |

## WASM-build dependencies (all built from source by `scripts/build-deps.sh`)

| Component | Pinned ref | Licence |
| --- | --- | --- |
| zlib | v1.3.2 | Zlib |
| libexpat | R_2_8_2 | MIT (Expat) |
| libffi | v3.7.1 | MIT |
| glib (kleisauke wasm-vips fork) | `3994b220` | LGPL-2.1-or-later |
| freetype | VER-2-14-3 | FTL/GPL-2.0-or-later dual |
| libxml2 | v2.15.3 | MIT |
| fontconfig | 2.18.2 | MIT (HPND-style) |
| harfbuzz | 14.3.0 | MIT (Old MIT) |
| eigen | 5.0.1 | MPL-2.0 |
| double-conversion | v3.4.0 | BSD-3-Clause |
| libzip | v1.11.4 | BSD-3-Clause |
| boost (filesystem, program_options, regex, system) | 1.87.0 | BSL-1.0 |

Deliberately NOT linked in the Manifold-only build: CGAL (+gmp/mpfr),
lib3mf (upstream falls back to dummy stubs), cairo (reported "disabled
(not found)"). A future CGAL-enabled build would add CGAL (GPL-3.0-or-later
/ LGPL-3.0-or-later), gmp (LGPL-3.0-or-later/GPL-2.0-or-later dual) and mpfr
(LGPL-3.0-or-later) rows here.

## Toolchain

| Component | Version | Licence |
| --- | --- | --- |
| Emscripten SDK | 6.0.5 | MIT (output is not covered) |
| gperf (host build tool for fontconfig) | 3.3 | GPL-3.0-or-later |

## Fonts

No font files ship in this package. `text()` support, if enabled, embeds
fontconfig/freetype/harfbuzz for shaping against caller-supplied fonts
mounted in the Emscripten FS (probe item: record with/without).
