# Contributing

1. Fork, branch, make your change.
2. `node --check src/*.mjs src/*.cjs bin/*.mjs test/*.mjs` and `bash -n scripts/*.sh` must pass, and `npm run test:unit` (pure JS, no build needed) must be green. `npm run docs:check` fails when the API reference and `src/openscad.d.ts` disagree, and ```` ```js check ```` blocks in the docs are syntax-checked by `npm run test:unit`.
3. If you changed upstream patches, run `git -C openscad apply --check ../third-party/patches/<patch>`.
4. `npm test` runs unit, smoke, feature and browser tests; all but the unit tests need a built `dist/` (the browser test also needs Playwright) and skip otherwise. Fixtures are in `test/fixtures/`; a native `openscad` on PATH enables byte-for-byte oracle diffing.
5. Docs: `npm run docs:dev` for live preview, `npm run docs:build` to verify. Update the docs and README when behaviour changes.
