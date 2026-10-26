// Remplace les régions d'un pays par ses subdivisions geoBoundaries (ADM2) découpées dans le contour Natural Earth,
// pour que les frontières restent identiques à celles des pays voisins.
//   node tools/adm2-assign.js <code> <type> <clipped.json> <slivers.json> <sortie.json>
// Les petits morceaux du contour non couverts par geoBoundaries (côtes, frontières) sont rattachés
// à la subdivision avec laquelle ils partagent le plus de sommets, sinon à la plus proche.
const fs = require("fs");
const [code, type, clippedFile, sliversFile, out] = process.argv.slice(2);
const rings = g => g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
const read = f => JSON.parse(fs.readFileSync(f, "utf8"));
const clipped = read(clippedFile).features.filter(f => f.geometry);
const slivers = fs.existsSync(sliversFile) ? read(sliversFile).features.filter(f => f.geometry && rings(f.geometry).some(r => r.length)) : [];
if (!clipped.length) { console.error(code + " : aucune subdivision, régions Natural Earth conservées"); process.exit(0); }

const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
const key = ([x, y]) => x.toFixed(5) + "," + y.toFixed(5);

// identifiants stables : code pays + nom (dédoublonné)
const seen = {};
const feats = clipped.map(f => {
  const name = (f.properties.shapeName || "?").replace(/\s*\*$/, "").trim();
  let id = code + "-D-" + slug(name);
  seen[id] = (seen[id] || 0) + 1;
  if (seen[id] > 1) id += "-" + seen[id];
  return { type: "Feature", geometry: f.geometry, properties: { id, n: name, t: type, g: code } };
});

const owner = new Map(), centers = [];
feats.forEach((f, i) => {
  let sx = 0, sy = 0, n = 0;
  for (const r of rings(f.geometry)) for (const p of r) { owner.set(key(p), i); sx += p[0]; sy += p[1]; n++; }
  centers.push([sx / n, sy / n]);
});
let byVertex = 0, byDistance = 0;
for (const s of slivers) {
  const votes = {};
  for (const r of rings(s.geometry)) for (const p of r) { const i = owner.get(key(p)); if (i !== undefined) votes[i] = (votes[i] || 0) + 1; }
  let best = -1, bv = 0;
  for (const [i, v] of Object.entries(votes)) if (v > bv) { bv = v; best = +i; }
  if (best < 0) {
    const p = rings(s.geometry)[0][0];
    let bd = Infinity;
    centers.forEach(([x, y], i) => { const d = (x - p[0]) ** 2 + (y - p[1]) ** 2; if (d < bd) { bd = d; best = i; } });
    byDistance++;
  } else byVertex++;
  feats.push({ type: "Feature", geometry: s.geometry, properties: { ...feats[best].properties } });
}
fs.writeFileSync(out, JSON.stringify({ type: "FeatureCollection", features: feats }));
console.error(`${code}: ${clipped.length} subdivisions, ${byVertex} morceaux rattachés par bord, ${byDistance} au plus proche`);
