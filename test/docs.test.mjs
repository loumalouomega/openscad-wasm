// Syntax-checks every ```js check fenced block in docs/**/*.md. Blocks are
// wrapped in an async function so top-level `await` is allowed, and compiled
// (never executed). Behaviour is covered by test/features.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const DOCS = join(dirname(dirname(fileURLToPath(import.meta.url))), "docs");

function mdFiles(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === ".vitepress" || n === "node_modules") return [];
    return statSync(p).isDirectory() ? mdFiles(p) : p.endsWith(".md") ? [p] : [];
  });
}

const blocks = [];
for (const file of mdFiles(DOCS)) {
  for (const m of readFileSync(file, "utf8").matchAll(/^```js check\n([\s\S]*?)^```/gm)) {
    blocks.push({ file: relative(DOCS, file), code: m[1] });
  }
}

test("docs contain checked js snippets", () => {
  assert.ok(blocks.length >= 5, `expected checked snippets, found ${blocks.length}`);
});

for (const [i, b] of blocks.entries()) {
  test(`snippet ${i + 1} in ${b.file} compiles`, () => {
    // import statements are rewritten to dynamic imports so the body compiles in a function.
    const body = b.code.replace(/^import\s+([\s\S]*?)\s+from\s+(['"][^'"]+['"]);?$/gm, "const $1 = await import($2);");
    assert.doesNotThrow(() => new vm.Script(`(async () => {\n${body}\n})`, { filename: b.file }));
  });
}
