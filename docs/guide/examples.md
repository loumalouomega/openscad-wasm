# Examples

Both examples import from `dist/`, so build (or download the CI `openscad-wasm-dist` artifact into `dist/`) first.

## Node — `examples/node/render.mjs`

Reads Customizer parameters, renders a binary STL with a `-D` override and `summary: true`, writes `box.stl`, and prints the indexed mesh size.

```bash
node examples/node/render.mjs
```

## Browser — `examples/browser/index.html`

A page with a text area and a **Render** button that calls `render(…, { format: 'stl' })`, shows the triangle count and offers the STL as a download. It sets `window.__done`, which the headless-Chromium test (`npm run test:browser`) waits on.

```bash
npm run example:browser   # serves the repo root on http://127.0.0.1:8080
```

Open `http://127.0.0.1:8080/examples/browser/index.html`. Any static server works as long as it sends `Content-Type: application/wasm` for the `.wasm`; no COOP/COEP headers are needed because the build is single-threaded.
