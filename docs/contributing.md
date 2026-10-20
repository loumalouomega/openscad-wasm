# Contributing

1. Fork, branch, make your change.
2. `node --check src/*.mjs src/*.cjs test/*.mjs` and `bash -n scripts/*.sh` must pass.
3. If you changed upstream patches, run `git -C openscad apply --check ../third-party/patches/<patch>`.
4. `npm test` needs a built `dist/`. Fixtures are in `test/fixtures/`; a native `openscad` on PATH enables byte-for-byte oracle diffing.
5. Docs: `npm run docs:dev` for live preview, `npm run docs:build` to verify. Update the docs and README when behaviour changes.
