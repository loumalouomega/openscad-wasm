// node examples/node/render.mjs  (after `npm run build`)
import { writeFileSync } from "node:fs";
import { render, renderToMesh, extractParameters } from "../../dist/openscad.mjs";

const src = `
/* [Box] */
width = 20; // [10:5:60]
height = 8;
cube([width, 10, height]);
`;
console.log(extractParameters(src));

const stl = await render(src, { format: "stl", defines: { width: 40 }, summary: true });
writeFileSync("box.stl", stl.output);
console.log(stl.summary);

const { positions, indices } = await renderToMesh(src);
console.log(`${positions.length / 3} vertices, ${indices.length / 3} triangles`);
